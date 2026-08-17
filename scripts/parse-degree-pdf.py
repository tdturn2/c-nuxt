#!/usr/bin/env python3
"""
Convert Asbury ARP degree-requirement PDFs into Degree Builder CSV.

Output columns match Connect Nuxt import (shared/degreeMapCsv.ts), plus optional course_credits:
  section_name,section_credits_required,section_order,specialization_name,
  course_code,item_order,course_title,course_credits

Usage:
  python3 scripts/parse-degree-pdf.py path/to/degree.pdf
  python3 scripts/parse-degree-pdf.py path/to/DegreesByYear -o degree-maps/csv
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("Install pypdf first: pip3 install --user pypdf", file=sys.stderr)
    raise

# Section headers always use "(N)" for required hours, e.g. "Linguistic Formation (6)".
# Require the opening "(" so prose like "NT Exegesis (NT610-649 or 710-749) 3" is not a section.
SECTION_RE = re.compile(
    r"^(?:(?:PHD\[IS\]|MDIV|MATS|MACM|MAM|MAL|MA|CERT|THM|DMIN)\s+)?"
    r"(?P<name>.+?)\s*\*?\s*\(\s*(?P<credits>\d+)\s*\)",
    re.IGNORECASE,
)

CODE_TOKEN = (
    r"[A-Z]{1,4}(?:/[A-Z]{1,4})?(?:\([A-Z]+\))?"
    r"(?:\d{2,3}(?:[-–]\d{2,3})?(?:/\d{2,3})?|\d*_+)"
)

COURSE_START_RE = re.compile(rf"^(?P<code>{CODE_TOKEN})\b(?P<rest>.*)$")

OR_LIST_RE = re.compile(
    rf"^(?P<codes>(?:{CODE_TOKEN})(?:\s+(?:or|OR)\s+(?:{CODE_TOKEN}))+)(?:\s+(?P<title>.*?))?\s+(?P<credits>\d+)\s*$"
)

SKIP_LINE_RE = re.compile(
    r"^(Production Date|Matric Term|Enrolled Term|Grad Deadline|Retired Date|Student:|"
    r"I\.D\.|#|Advisor|Faculty Advisor|Cum GPA|Residency Hrs|Last Term|Date Updated|"
    r"AUDIT REVIEW|R N$|Year$|Hrs$|Req$|Hours$|Earned|Waivers|Grade Status|Sem$|"
    r"Students seeking|ordination should|denominational|academic requirements|"
    r"mapping of their|TOTALS|Print Date|Min GPA|Non-Resident|Resident Hours|"
    r"Review Rsrch|Result:|Comprehensive Exam|Diss Proposal|Diss Defense|"
    r"Interdisc Colloq|Final Dissert|Date ARP|I:$|II:$|III:$|"
    r"Choose five|At least two|outside student|Courses in WME|strongly recommended|"
    r"Courses below|permission of Dean|\* May include|Register & attend)",
    re.IGNORECASE,
)

DEGREE_TITLE_HINT = re.compile(
    r"^(Master of|Doctor of|Certificate|Bachelor)",
    re.IGNORECASE,
)

NOISE_SUFFIX_RE = re.compile(
    r"\s+(?:AUDIT REVIEW BELOW|To Date|Result:|Comprehensive Exam|Diss Proposal Hearing|"
    r"Diss Defense Hearing|I:|II:|III:)\s*$",
    re.IGNORECASE,
)


@dataclass
class Row:
    section_name: str
    section_credits_required: int | None
    section_order: int
    specialization_name: str
    course_code: str
    item_order: int
    course_title: str
    course_credits: int | None


def normalize_text(text: str) -> str:
    return (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u00a0", " ")
        .replace("†", " ")
        .replace("│", " ")
        .replace("’", "'")
    )


def extract_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return normalize_text("\n".join((page.extract_text() or "") for page in reader.pages))


def looks_like_code(token: str) -> bool:
    token = token.strip().rstrip(",")
    if not token:
        return False
    return bool(re.fullmatch(CODE_TOKEN, token))


def primary_code(code_field: str) -> str:
    parts = re.split(r"\s+or\s+", code_field, flags=re.I)
    return re.sub(r"\s+", "", parts[0].strip().upper())


def slug_code_from_title(title: str, section: str, index: int) -> str:
    compact = re.sub(r"[^A-Z0-9]+", "", title.upper())[:18] or "REQ"
    sec = re.sub(r"[^A-Z0-9]+", "", section.upper())[:8] or "SEC"
    return f"OTHER-{sec}-{compact}-{index}"


def clean_trailing(text: str) -> str:
    return NOISE_SUFFIX_RE.sub("", text).strip(" -")


def is_section_header(ln: str) -> bool:
    m = SECTION_RE.match(ln)
    if not m:
        return False
    name = m.group("name").strip()
    first = name.split()[0] if name else ""
    # Course lines can look like "NT501 ... 3" but not "Foo (6)"
    if looks_like_code(first):
        return False
    # Prefer known section-ish words, or any "(N)" heading that isn't a course
    return True


def parse_credits_from_tail(text: str) -> tuple[str, int | None]:
    text = clean_trailing(text)
    m = re.search(r"^(.*?)(?:\s+)(\d+)\s*$", text)
    if not m:
        return text.strip(), None
    left, credits = m.group(1).strip(), int(m.group(2))
    return left, credits


def parse_degree_pdf(path: Path) -> tuple[dict[str, str], list[Row]]:
    text = extract_pdf_text(path)
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]

    meta: dict[str, str] = {"source": path.name, "degree_name": "", "catalog_year": ""}
    for ln in lines[:40]:
        if DEGREE_TITLE_HINT.search(ln) and not meta["degree_name"]:
            meta["degree_name"] = ln
        m = re.search(r"(20\d{2})\s+Catalog", ln, re.I)
        if m and not meta["catalog_year"]:
            meta["catalog_year"] = m.group(1)

    rows: list[Row] = []
    section_name: str | None = None
    section_credits: int | None = None
    section_order = -1
    item_order = 0
    specialization = ""
    in_requirements = False
    section_has_items = False

    def start_section(name: str, credits: int) -> None:
        nonlocal section_name, section_credits, section_order, item_order, specialization, section_has_items
        # If previous elective-only section had no rows, add a placeholder
        maybe_add_section_placeholder()
        section_order += 1
        section_name = re.sub(r"\s+", " ", name).strip(" *")
        section_credits = credits
        item_order = 0
        specialization = ""
        section_has_items = False

    def maybe_add_section_placeholder() -> None:
        nonlocal section_has_items, item_order
        if section_name and not section_has_items and section_credits:
            rows.append(
                Row(
                    section_name=section_name,
                    section_credits_required=section_credits,
                    section_order=section_order,
                    specialization_name=specialization,
                    course_code=slug_code_from_title("Electives", section_name, 0),
                    item_order=0,
                    course_title=f"{section_name} electives",
                    course_credits=section_credits,
                )
            )
            section_has_items = True

    def add_row(code: str, title: str, credits: int | None) -> None:
        nonlocal item_order, section_has_items
        assert section_name is not None
        rows.append(
            Row(
                section_name=section_name,
                section_credits_required=section_credits,
                section_order=section_order,
                specialization_name=specialization,
                course_code=code,
                item_order=item_order,
                course_title=title,
                course_credits=credits,
            )
        )
        item_order += 1
        section_has_items = True

    i = 0
    while i < len(lines):
        ln = lines[i]

        if re.search(r"COURSE REQUIREMENTS", ln, re.I):
            in_requirements = True
            i += 1
            continue

        if not in_requirements:
            i += 1
            continue

        if SKIP_LINE_RE.search(ln):
            i += 1
            continue

        if is_section_header(ln):
            sec = SECTION_RE.match(ln)
            assert sec
            start_section(sec.group("name"), int(sec.group("credits")))
            # Specialization track name on following short lines
            if re.search(r"specialization|development studies", section_name or "", re.I):
                j = i + 1
                parts: list[str] = []
                while j < len(lines):
                    nxt = lines[j]
                    if is_section_header(nxt) or COURSE_START_RE.match(nxt) or OR_LIST_RE.match(nxt):
                        break
                    if re.fullmatch(r"\d+", nxt):
                        break
                    if SKIP_LINE_RE.search(nxt):
                        j += 1
                        continue
                    if len(nxt) <= 40 and not re.search(r"\d{2,}", nxt):
                        parts.append(nxt)
                        j += 1
                        if len(parts) >= 3:
                            break
                        continue
                    break
                if parts:
                    specialization = " ".join(parts)
                    i = j - 1
            i += 1
            continue

        if section_name is None:
            i += 1
            continue

        if re.fullmatch(r"\d+", ln):
            i += 1
            continue

        # "CS638 OR CS652 3" / "CS/TH631 OR CS650 OR MS627 3"
        or_match = OR_LIST_RE.match(ln)
        if or_match:
            codes = or_match.group("codes")
            title = (or_match.group("title") or "").strip()
            title = clean_trailing(f"{codes} {title}".strip())
            add_row(primary_code(codes), title, int(or_match.group("credits")))
            i += 1
            continue

        # Multi-option OR lines that start mid-sentence after wrap (MATS)
        # e.g. previous line ended without credits; handled below via continuation

        started = COURSE_START_RE.match(ln)
        if started and looks_like_code(started.group("code")):
            code = started.group("code").upper()
            rest = started.group("rest").strip()
            rest, credits = parse_credits_from_tail(rest)

            # "NT(IBS)510 or NT(IBS)511 IBS 3"
            if re.match(r"^(?:or|OR)\b", rest) or re.search(r"\s(?:or|OR)\s+" + CODE_TOKEN, f"{code} {rest}"):
                # Re-parse whole line as OR list when possible
                whole = f"{code} {rest}" if credits is None else ln
                or2 = OR_LIST_RE.match(clean_trailing(whole) if credits is not None else whole)
                # Fallback: keep code + rest title
                if credits is None:
                    # credits on following line (e.g. ME9__ Concentration Electives / 9)
                    if i + 1 < len(lines) and re.fullmatch(r"\d+", lines[i + 1]):
                        credits = int(lines[i + 1])
                        i += 1
                    elif i + 2 < len(lines) and re.fullmatch(r"\d+", lines[i + 2]):
                        # blank-ish already stripped; sometimes note line then credits
                        pass
                title = clean_trailing(f"{code} {rest}".strip() if " or " in f" {rest} ".lower() else rest or code)
                if not title:
                    title = code
                # MS745 with 0 credits on later line
                if credits is None:
                    j = i + 1
                    while j < len(lines) and j <= i + 4:
                        if re.fullmatch(r"\d+", lines[j]):
                            credits = int(lines[j])
                            i = j
                            break
                        if is_section_header(lines[j]) or COURSE_START_RE.match(lines[j]):
                            break
                        j += 1
                add_row(primary_code(code), title if title else code, credits)
                i += 1
                continue

            if credits is None:
                # Title may continue; credits on a later numeric-only line
                title = rest
                j = i + 1
                while j < len(lines) and j <= i + 5:
                    nxt = lines[j]
                    if re.fullmatch(r"\d+", nxt):
                        credits = int(nxt)
                        i = j
                        break
                    if is_section_header(nxt) or (COURSE_START_RE.match(nxt) and looks_like_code(nxt.split()[0])):
                        break
                    if not SKIP_LINE_RE.search(nxt):
                        # append continuation only if it looks like title text
                        if not re.match(r"^(I{1,3}:|Result:)", nxt):
                            title = f"{title} {nxt}".strip()
                    j += 1
                add_row(code, clean_trailing(title) or code, credits)
                i += 1
                continue

            title = rest or code
            # Strip leading "or CODE" leftovers already handled
            if title.upper().startswith("OR "):
                title = f"{code} {title}"
            add_row(code, title, credits)
            i += 1
            continue

        # Prose requirement ending with hours: "NT Exegesis (NT610-649 or 710-749) 3"
        prose_title, prose_credits = parse_credits_from_tail(ln)
        if (
            prose_credits is not None
            and len(prose_title) >= 8
            and not SKIP_LINE_RE.search(prose_title)
            and not re.fullmatch(r"20\d{2}", prose_title)
        ):
            add_row(slug_code_from_title(prose_title, section_name, item_order), prose_title, prose_credits)
            i += 1
            continue

        i += 1

    maybe_add_section_placeholder()
    return meta, rows


def rows_to_csv(rows: list[Row], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "section_name",
                "section_credits_required",
                "section_order",
                "specialization_name",
                "course_code",
                "item_order",
                "course_title",
                "course_credits",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.section_name,
                    "" if row.section_credits_required is None else row.section_credits_required,
                    row.section_order,
                    row.specialization_name,
                    row.course_code,
                    row.item_order,
                    row.course_title,
                    "" if row.course_credits is None else row.course_credits,
                ]
            )


def default_csv_name(pdf: Path) -> str:
    base = re.sub(r"\s+", "-", pdf.stem)
    base = re.sub(r"[^A-Za-z0-9._()-]+", "", base)
    return f"{base}.csv"


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse ARP degree PDFs into Degree Builder CSV")
    parser.add_argument("inputs", nargs="+", help="PDF files or directories")
    parser.add_argument("-o", "--out-dir", type=Path, default=Path("degree-maps/csv"))
    parser.add_argument("--stdout", action="store_true")
    args = parser.parse_args()

    pdfs: list[Path] = []
    for raw in args.inputs:
        p = Path(raw).expanduser()
        if p.is_dir():
            pdfs.extend(sorted(p.rglob("*.pdf")))
        elif p.is_file():
            pdfs.append(p)
        else:
            print(f"skip missing: {p}", file=sys.stderr)

    if not pdfs:
        print("No PDFs found.", file=sys.stderr)
        return 1

    for pdf in pdfs:
        meta, rows = parse_degree_pdf(pdf)
        out = args.out_dir / default_csv_name(pdf)
        if args.stdout and len(pdfs) == 1:
            rows_to_csv(rows, Path("/dev/stdout"))
        else:
            rows_to_csv(rows, out)
            print(
                f"{pdf.name}: {len(rows)} rows / "
                f"{len({r.section_name for r in rows})} sections -> {out}"
            )
            if meta.get("degree_name"):
                print(f"  degree: {meta['degree_name']} ({meta.get('catalog_year') or '?'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
