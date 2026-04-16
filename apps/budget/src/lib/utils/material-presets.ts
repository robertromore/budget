import * as THREE from "three";

const cache = new Map<string, THREE.MeshStandardMaterial>();

function cached(key: string, factory: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  if (!cache.has(key)) {
    cache.set(key, factory());
  }
  return cache.get(key)!;
}

export function wallMaterial(color?: string): THREE.MeshStandardMaterial {
  const c = color ?? "#e5e7eb";
  return cached(`wall-${c}`, () =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 })
  );
}

export function floorMaterial(color?: string): THREE.MeshStandardMaterial {
  const c = color ?? "#d1d5db";
  return cached(`floor-${c}`, () =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, side: THREE.DoubleSide })
  );
}

export function furnitureMaterial(color?: string): THREE.MeshStandardMaterial {
  const c = color ?? "#92400e";
  return cached(`furniture-${c}`, () =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1 })
  );
}

export function glassMaterial(): THREE.MeshStandardMaterial {
  return cached("glass", () =>
    new THREE.MeshStandardMaterial({
      color: "#87ceeb",
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.4,
    })
  );
}

export function doorMaterial(color?: string): THREE.MeshStandardMaterial {
  const c = color ?? "#8b4513";
  return cached(`door-${c}`, () =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0 })
  );
}

export function disposeMaterials(): void {
  for (const mat of cache.values()) {
    mat.dispose();
  }
  cache.clear();
}
