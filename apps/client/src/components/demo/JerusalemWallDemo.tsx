import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import type { Material, Object3D } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Trophy, Mountain, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { getWallHeight, getWallTier, type DemoTeam } from "./jerusalemWallMath";

const demoTeams: DemoTeam[] = [
  { id: "judah", name: "Judah", score: 124, color: "#b45309" },
  { id: "benjamin", name: "Benjamin", score: 82, color: "#2563eb" },
  { id: "levi", name: "Levi", score: 41, color: "#15803d" },
  { id: "reuben", name: "Reuben", score: 116, color: "#c2410c" },
  { id: "simeon", name: "Simeon", score: 95, color: "#7c3aed" },
  { id: "issachar", name: "Issachar", score: 88, color: "#0f766e" },
  { id: "zebulun", name: "Zebulun", score: 73, color: "#ea580c" },
  { id: "dan", name: "Dan", score: 64, color: "#1d4ed8" },
  { id: "naphtali", name: "Naphtali", score: 57, color: "#059669" },
  { id: "gad", name: "Gad", score: 111, color: "#b91c1c" },
  { id: "asher", name: "Asher", score: 97, color: "#ca8a04" },
  { id: "ephraim", name: "Ephraim", score: 139, color: "#7c2d12" },
  { id: "manasseh", name: "Manasseh", score: 104, color: "#0369a1" },
  { id: "naphtali-east", name: "Naphtali E", score: 51, color: "#65a30d" },
  { id: "joseph", name: "Joseph", score: 146, color: "#8b5cf6" },
  { id: "zara", name: "Zara", score: 67, color: "#d97706" },
  { id: "leah", name: "Leah", score: 79, color: "#db2777" },
  { id: "rachel", name: "Rachel", score: 112, color: "#0891b2" },
];

const WALL_RADIUS = 7.8;
const WALL_TOP = 8.8;
const CAMERA_FOV = 42;
const CAMERA_PADDING = 1.18;
const CAMERA_MIN_DISTANCE = 20;
const SECTION_MIN_HEIGHT = 560;

function getFramingDistance(width: number, height: number) {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const verticalFov = THREE.MathUtils.degToRad(CAMERA_FOV);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const radius = Math.hypot(WALL_RADIUS + 1.8, WALL_TOP * 0.5);
  const verticalDistance = radius / Math.tan(verticalFov / 2);
  const horizontalDistance = radius / Math.tan(horizontalFov / 2);

  return Math.max(verticalDistance, horizontalDistance) * CAMERA_PADDING;
}

function setCameraPanFrame(
  camera: THREE.PerspectiveCamera,
  angle: number,
  distance: number,
  baseHeight: number,
  driftY = 0,
) {
  const cameraAngle = angle;
  const lookAheadAngle = angle + 0.18;
  const focusRadius = WALL_RADIUS * 0.2;

  camera.position.set(
    Math.cos(cameraAngle) * distance,
    baseHeight + driftY,
    Math.sin(cameraAngle) * distance,
  );
  camera.lookAt(
    Math.cos(lookAheadAngle) * focusRadius,
    2.8,
    Math.sin(lookAheadAngle) * focusRadius,
  );
}

export const JerusalemWallDemo: React.FC = () => {
  const { t } = useTranslation();
  const mountRef = useRef<HTMLDivElement | null>(null);

  const teams = useMemo(() => [...demoTeams].sort((a, b) => b.score - a.score), []);
  const maxScore = Math.max(1, ...teams.map((team) => team.score));

  useEffect(() => {
    document.title = t("demo.document_title");
  }, [t]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4ead7");

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      Math.max(mount.clientWidth, 1) / Math.max(mount.clientHeight, 1),
      0.1,
      140,
    );
    setCameraPanFrame(camera, mount.clientWidth, mount.clientHeight, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(Math.max(mount.clientWidth, 1), Math.max(mount.clientHeight, 1));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = WALL_RADIUS + 5;
    controls.maxDistance = 40;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.target.set(0, 2.8, 0);

    const getViewport = () => {
      const rect = mount.getBoundingClientRect();
      return {
        width: Math.max(rect.width, 1),
        height: Math.max(rect.height, SECTION_MIN_HEIGHT, 1),
      };
    };

    const getAutoDistance = () => {
      const { width, height } = getViewport();
      return Math.max(
        CAMERA_MIN_DISTANCE,
        getFramingDistance(width, height),
      );
    };

    const syncViewport = () => {
      const { width, height } = getViewport();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (!isDragging) {
        autoDistance = Math.max(autoDistance, getAutoDistance());
        setCameraPanFrame(camera, autoAngle, autoDistance, autoBaseHeight);
      }
    };

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambient);

    const sky = new THREE.HemisphereLight(0xfff5d6, 0xc9b187, 1.2);
    scene.add(sky);

    const sun = new THREE.DirectionalLight(0xffe4b5, 2.2);
    sun.position.set(8, 14, 10);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.5, 64),
      new THREE.MeshStandardMaterial({ color: "#d8c7a6" }),
    );
    ground.position.y = -0.25;
    scene.add(ground);

    const cityCore = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 2.5, 24),
      new THREE.MeshStandardMaterial({ color: "#b08b5a", roughness: 1 }),
    );
    cityCore.position.y = 1.25;
    scene.add(cityCore);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 24, 24),
      new THREE.MeshStandardMaterial({
        color: "#d9b14c",
        emissive: "#5a4300",
        emissiveIntensity: 0.15,
      }),
    );
    dome.position.set(0, 3.3, 0);
    scene.add(dome);

    const wallGroup = new THREE.Group();
    scene.add(wallGroup);

    teams.forEach((team, index) => {
      const angle = (index / Math.max(teams.length, 1)) * Math.PI * 2;
      const radius = WALL_RADIUS;
      const height = getWallHeight(team.score, maxScore);

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, height, 0.9),
        new THREE.MeshStandardMaterial({
          color: team.color,
          roughness: 0.95,
          metalness: 0.05,
        }),
      );

      wall.position.set(
        Math.cos(angle) * radius,
        height / 2,
        Math.sin(angle) * radius,
      );
      wall.lookAt(0, height / 2, 0);
      wallGroup.add(wall);

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, height + 0.8, 8),
        new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.9 }),
      );
      tower.position.set(
        Math.cos(angle) * (radius + 0.6),
        (height + 0.8) / 2,
        Math.sin(angle) * (radius + 0.6),
      );
      wallGroup.add(tower);
    });

    const stones = new Array(40).fill(0).map((_, index) => {
      const angle = (index / 40) * Math.PI * 2;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, 0.22),
        new THREE.MeshStandardMaterial({ color: "#9f8663" }),
      );
      stone.position.set(Math.cos(angle) * 9.9, 0.09, Math.sin(angle) * 9.9);
      stone.rotation.y = angle * 2;
      scene.add(stone);
      return stone;
    });

    let rafId = 0;
    let frame = 0;
    let isDragging = false;
    let autoAngle = 0;
    let autoDistance = getAutoDistance();
    let autoBaseHeight = 9.2;

    controls.addEventListener("start", () => {
      isDragging = true;
    });
    controls.addEventListener("end", () => {
      isDragging = false;
      autoAngle = Math.atan2(camera.position.z, camera.position.x);
      autoDistance = Math.max(CAMERA_MIN_DISTANCE, Math.hypot(camera.position.x, camera.position.z));
      autoBaseHeight = camera.position.y;
    });

    const animate = () => {
      frame += 1;

      const driftY = Math.sin(frame * 0.006) * 0.16;
      if (!isDragging) {
        autoAngle += 0.0012;
        setCameraPanFrame(
          camera,
          autoAngle,
          autoDistance,
          autoBaseHeight,
          driftY,
        );
        controls.target.set(0, 2.8, 0);
      }

      dome.rotation.y += 0.004;
      dome.position.y = 3.3 + Math.sin(frame * 0.018) * 0.06;
      cityCore.rotation.y = Math.sin(frame * 0.008) * 0.02;
      cityCore.position.y = 1.25 + Math.sin(frame * 0.02) * 0.035;
      wallGroup.position.y = Math.sin(frame * 0.012) * 0.04;
      stones.forEach((stone, stoneIndex) => {
        stone.rotation.y += 0.003 + stoneIndex * 0.00002;
        stone.position.y = 0.09 + Math.sin(frame * 0.02 + stoneIndex * 0.15) * 0.012;
      });

      controls.update();
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    animate();
    syncViewport();

    const onResize = () => {
      syncViewport();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafId);
      controls.dispose();
      mount.removeChild(renderer.domElement);
      renderer.dispose();

      scene.traverse((object: Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();

          if (Array.isArray(object.material)) {
            object.material.forEach((material: Material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [teams]);

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7e6_0%,_#f4ead7_40%,_#e9dcc0_100%)] text-slate-900"
      data-testid="demo-route"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_80px_rgba(120,92,40,0.12)] backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-amber-700">
              <Sparkles className="h-4 w-4" />
              {t("demo.header_badge")}
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              {t("demo.title")}
            </h1>
            <p className="max-w-2xl text-base font-medium text-slate-600 sm:text-lg">
              {t("demo.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">
            <Mountain className="h-4 w-4" />
            {t("demo.orbit_hint")}
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.85fr)]">
          <section className="relative min-h-[560px] overflow-hidden rounded-[2.5rem] border border-white/70 bg-[#f6eddc] shadow-[0_30px_100px_rgba(120,92,40,0.18)]">
            <div ref={mountRef} className="h-[560px] w-full" data-testid="demo-canvas-mount" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#d8c7a6] via-[#d8c7a6]/90 to-transparent" />
            <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-black/70 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-white">
              {t("demo.city_label")}
            </div>
            <div className="pointer-events-none absolute bottom-5 left-5 flex flex-wrap gap-2">
              {teams.map((team) => (
                <span
                  key={team.id}
                  className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm"
                >
                  {team.name} {team.score}
                </span>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="rounded-[2rem] border-white/70 bg-white/80 p-5 shadow-[0_20px_70px_rgba(120,92,40,0.12)] backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-[0.25em] text-slate-700">
                  {t("demo.leaderboard_title")}
                </h2>
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>

              <div className="mt-5 space-y-3" data-testid="demo-leaderboard">
                {teams.map((team, index) => {
                  const tier = getWallTier(team.score, maxScore);

                  return (
                    <div
                      key={team.id}
                      data-testid={`demo-team-${team.id}`}
                      className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white to-amber-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white shadow-md"
                            style={{ backgroundColor: team.color }}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-lg font-black text-slate-900">{team.name}</p>
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                              {t(`demo.tiers.${tier}`)}
                            </p>
                          </div>
                        </div>
                        <p className="text-3xl font-black text-amber-700">{team.score}</p>
                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(10, (team.score / maxScore) * 100)}%`,
                            backgroundColor: team.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-[2rem] border-white/70 bg-white/80 p-5 shadow-[0_20px_70px_rgba(120,92,40,0.12)] backdrop-blur">
              <h3 className="text-sm font-black uppercase tracking-[0.35em] text-amber-700">
                {t("demo.how_it_works_title")}
              </h3>
              <ul className="mt-4 space-y-3 text-sm font-medium text-slate-600">
                <li>{t("demo.how_it_works_1")}</li>
                <li>{t("demo.how_it_works_2")}</li>
                <li>{t("demo.how_it_works_3")}</li>
              </ul>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
};
