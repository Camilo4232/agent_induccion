import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * Login background — institutional 3D field.
 * Per UX brief: 8 shapes max, 2 forms only (torus + octahedron), 15% opacity.
 * Per Brand brief: shapes are not decoration; we restrict to two forms that read as "structure".
 * On mobile (<768px) or prefers-reduced-motion, render a static gradient instead.
 */

const PALETTE_GOLD = '#c69740'

function FloatingShape({ position, rotation, scale, speed, shape }) {
  const ref = useRef()
  const baseX = position[0]
  const baseY = position[1]
  const phase = position[0] * 7.13 + position[1] * 3.91

  useFrame((state, delta) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    // Slower rotation — UX recommended 0.05-0.1 rad/s
    ref.current.rotation.x += delta * speed * 0.18
    ref.current.rotation.y += delta * speed * 0.22
    // Long, slow drift (~25s cycle)
    ref.current.position.y = baseY + Math.sin(t * 0.25 + phase) * 0.18
    ref.current.position.x = baseX + Math.cos(t * 0.18 + phase) * 0.12
  })

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
      {shape === 'torus'
        ? <torusGeometry args={[0.22, 0.07, 10, 28]} />
        : <octahedronGeometry args={[0.26, 0]} />}
      <meshBasicMaterial
        color={PALETTE_GOLD}
        wireframe
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function ShapeField() {
  // 8 shapes total, alternating torus + octahedron, spread across the panel
  const shapes = useMemo(() => {
    const seeds = [
      { pos: [-2.4,  2.6, -1.2], shape: 'torus',     scale: 1.3, speed: 0.5 },
      { pos: [ 1.9,  3.1,  0.4], shape: 'octahedron', scale: 1.1, speed: 0.7 },
      { pos: [-1.2,  0.3,  1.0], shape: 'octahedron', scale: 1.6, speed: 0.4 },
      { pos: [ 2.6, -0.4, -0.8], shape: 'torus',     scale: 1.4, speed: 0.6 },
      { pos: [-2.8, -1.8,  0.6], shape: 'octahedron', scale: 1.2, speed: 0.55 },
      { pos: [ 1.4, -2.5, -1.4], shape: 'torus',     scale: 1.0, speed: 0.65 },
      { pos: [ 0.0,  1.4, -2.0], shape: 'torus',     scale: 0.9, speed: 0.45 },
      { pos: [ 0.2, -3.4,  0.8], shape: 'octahedron', scale: 1.0, speed: 0.5 },
    ]
    return seeds.map((s, i) => ({
      id: i,
      position: s.pos,
      rotation: [s.pos[0] * 0.5, s.pos[1] * 0.3, 0],
      scale: s.scale,
      speed: s.speed,
      shape: s.shape,
    }))
  }, [])

  return (
    <>
      {shapes.map((s) => (
        <FloatingShape
          key={s.id}
          position={s.position}
          rotation={s.rotation}
          scale={s.scale}
          speed={s.speed}
          shape={s.shape}
        />
      ))}
    </>
  )
}

function StaticGradient() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'radial-gradient(40% 40% at 25% 30%, rgba(198,151,64,0.10), transparent 70%),' +
          'radial-gradient(35% 35% at 80% 75%, rgba(198,151,64,0.06), transparent 70%)',
      }}
    />
  )
}

export default function MobiusBackground() {
  const [reduced, setReduced] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sizeMq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setReduced(motionMq.matches)
      setIsMobile(sizeMq.matches)
    }
    update()
    motionMq.addEventListener?.('change', update)
    sizeMq.addEventListener?.('change', update)
    return () => {
      motionMq.removeEventListener?.('change', update)
      sizeMq.removeEventListener?.('change', update)
    }
  }, [])

  if (reduced || isMobile) {
    return <StaticGradient />
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.4} />
        <ShapeField />
      </Canvas>
    </div>
  )
}
