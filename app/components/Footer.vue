<template>
  <footer class="border-t border-gray-200 bg-white">
    <div class="container mx-auto px-4 py-12">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">Connect</h3>
          <p class="text-sm text-gray-600">
            Building connections that matter.
          </p>
        </div>
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-900">Product</h4>
          <ul class="space-y-2 text-sm text-gray-600">
            <!-- <li>
              <NuxtLink to="/features" class="hover:text-gray-900 transition-colors">
                Features
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/pricing" class="hover:text-gray-900 transition-colors">
                Pricing
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/docs" class="hover:text-gray-900 transition-colors">
                Documentation
              </NuxtLink>
            </li> -->
          </ul>
        </div>
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-900">Company</h4>
          <ul class="space-y-2 text-sm text-gray-600">
            <!-- <li>
              <NuxtLink to="/about" class="hover:text-gray-900 transition-colors">
                About
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/blog" class="hover:text-gray-900 transition-colors">
                Blog
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/careers" class="hover:text-gray-900 transition-colors">
                Careers
              </NuxtLink>
            </li> -->
          </ul>
        </div>
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-900">Support</h4>
          <ul class="space-y-2 text-sm text-gray-600">
            <!-- <li>
              <NuxtLink to="/contact" class="hover:text-gray-900 transition-colors">
                Contact
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/help" class="hover:text-gray-900 transition-colors">
                Help Center
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/privacy" class="hover:text-gray-900 transition-colors">
                Privacy Policy
              </NuxtLink>
            </li> -->
          </ul>
        </div>
      </div>
      <div class="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
        <p>&copy; {{ new Date().getFullYear() }} Connect. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
</script>
