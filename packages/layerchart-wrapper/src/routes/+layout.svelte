<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
  <nav class="border-b bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 dark:border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          <a href="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">LC</span>
            </div>
            <span class="font-bold text-xl text-slate-900 dark:text-white">LayerChart Wrapper</span>
          </a>
          
          <div class="hidden md:flex items-center space-x-6">
            <a href="/" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Home</a>
            <a href="/examples" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Examples</a>
            <a href="/components" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Components</a>
            <a href="/api" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">API</a>
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <a href="https://github.com/layerchart/layerchart" target="_blank" rel="noopener noreferrer" 
             class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <slot />
  </main>
</div>

<style>
  :global(html) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
</style>