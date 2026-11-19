// Cars: parked traffic you can steal, plus the driving model.
// A car is a low-poly box build with wheels; driving is arcade: accelerate,
// brake/reverse, steering scaled by speed, proportional drag. The numbers are
// tuned so holding W reaches 10 u/s quickly even at ~5 fps headless (dt cap 0.1).

import * as THREE from 'three';
import { CAR, CARS } from './config.js';
import { makeRng } from './random.js';

function buildCarMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.2, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), darkMat);
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    g.add(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const x of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    light.position.set(x, 0.7, 2.22);
    g.add(light);
  }
  return g;
}

export function createVehicles(scene, carSpots, seed) {
  const rng = makeRng(seed + 7);
  const group = new THREE.Group();
  scene.add(group);

  const cars = carSpots.map((spot, i) => {
    const def = CARS[i % CARS.length];
    const mesh = buildCarMesh(def.color);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.heading;
    group.add(mesh);
    return {
      x: spot.x,
      z: spot.z,
      heading: spot.heading,
      speed: 0,
      health: 100,
      def,
      mesh,
      parked: true,
    };
  });

  // The player's current car (null on foot). Exposed on __solmara.currentCar.
  let currentCar = null;

  function nearestCar(x, z, maxDist = CAR.enterRadius) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (car === currentCar) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function enterCar(car) {
    currentCar = car;
    car.parked = false;
    car.speed = 0;
    return car;
  }

  function exitCar() {
    if (!currentCar) return null;
    const car = currentCar;
    currentCar = null;
    car.speed = 0;
    return car;
  }

  function update(dt, input, state) {
    if (!currentCar) return;
    const car = currentCar;
    const forward = input.isHeld('KeyW');
    const back = input.isHeld('KeyS');
    const left = input.isHeld('KeyA');
    const right = input.isHeld('KeyD');
    if (forward) car.speed += CAR.accel * dt;
    if (back) {
      if (car.speed > 0.5) car.speed -= CAR.brake * dt;
      else car.speed -= CAR.reverseAccel * dt;
    }
    // Drag + rolling resistance.
    car.speed -= car.speed * CAR.drag * dt;
    if (!forward && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 4 * dt);
    const top = car.def.topSpeed || CAR.topSpeed;
    car.speed = Math.max(-CAR.reverseTopSpeed, Math.min(top, car.speed));
    if (Math.abs(car.speed) < 0.05 && !forward && !back) car.speed = 0;
    // Steering: sharper at low speed, stable at high speed.
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    const speedFactor = Math.min(1, Math.abs(car.speed) / 12);
    car.heading += steer * CAR.turnRate * speedFactor * dt * Math.sign(car.speed || 1);
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.x += fx * car.speed * dt;
    car.z += fz * car.speed * dt;
    // Stay inside the city.
    car.x = Math.max(-158, Math.min(158, car.x));
    car.z = Math.max(-158, Math.min(158, car.z));
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // Hitting a roadblock at speed slows the car hard.
    for (const b of state.world.roadblocks) {
      if (!b.active) continue;
      if (Math.hypot(car.x - b.x, car.z - b.z) < 4) {
        car.speed *= 0.4;
        car.x -= fx * 1.2;
        car.z -= fz * 1.2;
      }
    }
  }

  return {
    group,
    cars,
    get currentCar() {
      return currentCar;
    },
    nearestCar,
    enterCar,
    exitCar,
    update,
    buildCarMesh,
  };
}
