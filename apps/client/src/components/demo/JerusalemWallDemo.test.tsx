import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, flushEffects } from "../../test/render";
import { JerusalemWallDemo } from "./JerusalemWallDemo";

const threeState = {
  meshes: [] as MockMesh[],
};

class MockVector3 {
  x = 0;

  y = 0;

  z = 0;

  set = vi.fn((x: number, y: number, z: number) => {
    this.x = x;
    this.y = y;
    this.z = z;
  });
}

class MockObject3D {
  children: MockObject3D[] = [];

  position = new MockVector3();

  rotation = { y: 0 };

  add = vi.fn((...objects: MockObject3D[]) => {
    this.children.push(...objects);
  });

  lookAt = vi.fn();

  traverse = (callback: (object: MockObject3D) => void) => {
    callback(this);
    this.children.forEach((child) => {
      if (child instanceof MockObject3D) {
        child.traverse(callback);
      } else {
        callback(child);
      }
    });
  };
}

class MockGeometry {
  dispose = vi.fn();
}

class MockMaterial {
  dispose = vi.fn();
}

class MockMesh extends MockObject3D {
  geometry: MockGeometry;

  material: MockMaterial;

  constructor(geometry: MockGeometry, material: MockMaterial) {
    super();
    this.geometry = geometry;
    this.material = material;
    threeState.meshes.push(this);
  }
}

class MockScene extends MockObject3D {
  background: unknown;

  fog: unknown;
}

class MockCamera extends MockObject3D {
  aspect = 1;

  updateProjectionMatrix = vi.fn();
}

class MockRenderer {
  domElement = document.createElement("canvas");

  setPixelRatio = vi.fn();

  setSize = vi.fn();

  render = vi.fn();

  dispose = vi.fn();
}

vi.mock("three", () => {
  class MockColor {
    value: string;

    constructor(value: string) {
      this.value = value;
    }
  }

  class MockFog {
    color: string;

    near: number;

    far: number;

    constructor(color: string, near: number, far: number) {
      this.color = color;
      this.near = near;
      this.far = far;
    }
  }

  return {
    AmbientLight: class extends MockObject3D {},
    BoxGeometry: MockGeometry,
    Color: MockColor,
    CylinderGeometry: MockGeometry,
    DirectionalLight: class extends MockObject3D {},
    Fog: MockFog,
    Group: class extends MockObject3D {},
    Mesh: MockMesh,
    MeshStandardMaterial: MockMaterial,
    PerspectiveCamera: MockCamera,
    Scene: MockScene,
    SphereGeometry: MockGeometry,
    WebGLRenderer: MockRenderer,
  };
});

describe("JerusalemWallDemo", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    threeState.meshes.splice(0, threeState.meshes.length);
  });

  it("renders the demo scoreboard and mounts a canvas", async () => {
    const view = render(<JerusalemWallDemo />);
    await flushEffects();

    expect(view.container.textContent).toContain("Jerusalem Wall Highscores");
    expect(view.container.querySelector('[data-testid="demo-route"]')).not.toBeNull();
    expect(view.container.querySelector('[data-testid="demo-leaderboard"]')).not.toBeNull();
    expect(view.container.querySelectorAll("canvas").length).toBe(1);

    view.unmount();
  });
});
