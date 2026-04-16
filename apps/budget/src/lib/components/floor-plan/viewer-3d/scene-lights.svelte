<script lang="ts">
  import { T } from "@threlte/core";
</script>

<!-- Ambient light -->
<T.AmbientLight intensity={0.5} />

<!-- Primary directional light with shadows -->
<T.DirectionalLight
  position={[10, 15, 10]}
  intensity={1.2}
  castShadow
  shadow.mapSize.width={1024}
  shadow.mapSize.height={1024}
  shadow.camera.near={0.1}
  shadow.camera.far={50}
  shadow.camera.left={-20}
  shadow.camera.right={20}
  shadow.camera.top={20}
  shadow.camera.bottom={-20}
/>

<!-- Fill light -->
<T.DirectionalLight
  position={[-5, 8, -5]}
  intensity={0.4}
/>

<!-- Back light -->
<T.DirectionalLight
  position={[0, 5, -10]}
  intensity={0.3}
/>
