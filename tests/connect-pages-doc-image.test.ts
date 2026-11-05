import { describe, expect, it } from 'vitest'
import {
  CONNECT_PAGES_MEDIA_RELATION,
  lexicalUploadNodeToTipTapImage,
  resolveConnectPagesMediaFromLexicalValue,
  tipTapImageToLexicalUploadNode,
} from '../app/utils/connectPagesDocImage'

describe('connect page images', () => {
  it('saves the file URL with the image so the page can render it', () => {
    const saved = tipTapImageToLexicalUploadNode({
      attrs: {
        src: '/api/connect-pages-media/file/theta-crest.jpg',
        alt: 'Theta crest',
      },
    })
    expect(saved?.relationTo).toBe(CONNECT_PAGES_MEDIA_RELATION)
    expect(saved?.value).toMatchObject({
      url: '/api/connect-pages-media/file/theta-crest.jpg',
      filename: 'theta-crest.jpg',
      alt: 'Theta crest',
    })
  })

  it('round-trips an image back into the editor', () => {
    const saved = tipTapImageToLexicalUploadNode({
      attrs: { src: 'http://localhost:3003/api/connect-pages-media/file/crest.jpg', alt: 'Crest' },
    })
    const [image] = lexicalUploadNodeToTipTapImage(saved!, 'http://localhost:3003')
    expect(image).toMatchObject({
      type: 'image',
      attrs: {
        src: '/api/connect-pages-media/file/crest.jpg',
        alt: 'Crest',
      },
    })
  })

  it('keeps float and size on the saved image', () => {
    const saved = tipTapImageToLexicalUploadNode({
      attrs: {
        src: '/api/connect-pages-media/file/crest.jpg',
        alt: 'Crest',
        align: 'left',
        size: 'medium',
      },
    })
    const [image] = lexicalUploadNodeToTipTapImage(saved!, '')
    expect(image.attrs).toMatchObject({ align: 'left', size: 'medium' })
  })

  it('recovers images that were saved as a bare filename', () => {
    expect(resolveConnectPagesMediaFromLexicalValue('theta crest.jpg')).toMatchObject({
      url: '/api/connect-pages-media/file/theta%20crest.jpg',
    })
  })
})
