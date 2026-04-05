<script lang="ts">
  let message = $state("Hello from Budget Desktop");
</script>

<main>
  <h1>{message}</h1>
  <p>Electrobun + Svelte + @budget/core</p>
</main>

<style>
  main {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 600px;
    margin: 4rem auto;
    text-align: center;
  }

  h1 {
    color: #333;
    font-size: 2rem;
  }

  p {
    color: #666;
    font-size: 1.1rem;
  }
</style>
