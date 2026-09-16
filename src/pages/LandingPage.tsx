import { ArrowRight, FlaskConical, Microscope, UserCog, UserRound } from 'lucide-react'
import { type ComponentType, useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROLE_HOME } from '@/app/navigation'
import AeroShards from '@/components/landing/AeroShards'
import { AeroShardsCanvas } from '@/components/landing/AeroShardsCanvas'
import { ChromaGrid } from '@/components/landing/ChromaGrid'
import { Spotlight } from '@/components/landing/Spotlight'
import { useAuth } from '@/hooks/useAuth'
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from '@/types'

const ROLE_ICONS: Record<Role, ComponentType<{ className?: string }>> = {
  admin: UserCog,
  patient: UserRound,
  technician: FlaskConical,
  pathologist: Microscope,
}

/**
 * Landing and role selection.
 *
 * This is the one deliberately expressive surface in the product: a chroma
 * grid, drifting glass shards and frosted role cards. Everything past the
 * sign-in stays flat and clinical, because dense diagnostic tables are read,
 * not admired.
 *
 * Authored dark regardless of the app theme - glass only reads correctly
 * against a dark ground. Body text sits at #f4f7fb on a #05070d base, well
 * clear of AA, and every card is a real button so the whole page is keyboard
 * operable with the decoration switched off.
 */
export function LandingPage() {
  const { session, loginAs } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  // Set once the GPU renderer reports it cannot run, which swaps the
  // background to the Canvas 2D field.
  const [gpuFailed, setGpuFailed] = useState(false)
  const handleGpuError = useCallback((error: Error) => {
    console.warn('AeroShards GPU renderer unavailable, using the canvas field:', error.message)
    setGpuFailed(true)
  }, [])

  if (session) {
    return <Navigate to={from ?? ROLE_HOME[session.user.role] ?? '/dashboard'} replace />
  }

  const signIn = (role: Role) => {
    loginAs(role)
    navigate(from ?? ROLE_HOME[role] ?? '/dashboard', { replace: true })
  }

  return (
    <div className="landing-root flex min-h-screen flex-col">
      {/*
        Background stack.

        AeroShards is the React Bits GPU component, which paints its own
        opaque #120F17 ground - so ChromaGrid only renders underneath as the
        fallback ground, visible if the GPU renderer cannot start.

        vgpu targets WebGPU. On a browser or machine without it the component
        reports through onError, and we swap in the dependency-free Canvas 2D
        field so the page is never left with a flat empty background.
      */}
      {gpuFailed ? (
        <>
          <ChromaGrid />
          <AeroShardsCanvas
            shardColor="#896ABD"
            accentColor="#A855F7"
            shardSize={1.1}
            speed={1}
            spin={1}
            density={1.5}
            spread={1}
            depth={1}
            interaction="repel"
            holdToGather
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-0">
          <AeroShards
            backgroundColor="#120F17"
            shardColor="#896ABD"
            accentColor="#A855F7"
            placement="full"
            flow="stream"
            material="pearl"
            detail="balanced"
            effect="none"
            scale={1}
            spread={1}
            depth={1}
            speed={1}
            spin={1}
            interaction="repel"
            density={1.5}
            shardSize={1.1}
            stretch={1}
            turbulence={1}
            glow={1}
            edgeSoftness={2}
            bloom={0.5}
            grain={0.05}
            chromaticAberration={0.0075}
            transitionDuration={1}
            interactionRadius={1.5}
            interactionStrength={0.5}
            rippleIntensity={1}
            holdToGather
            onError={handleGpuError}
          />
        </div>
      )}

      <main
        id="main-content"
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-14 sm:px-8"
      >
        <header className="max-w-2xl">
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--landing-ink)] sm:text-5xl">
            Meridian Diagnostics
            <span className="block text-[var(--landing-ink-soft)]">
              Laboratory Information System
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--landing-ink-soft)]">
            Patient registration, test ordering, sample intake, result entry and
            diagnostic reporting, in one workflow. Choose a role to enter the system.
          </p>
        </header>

        <section aria-labelledby="role-heading" className="mt-10">
          <h2 id="role-heading" className="sr-only">
            Choose a role
          </h2>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => {
              const Icon = ROLE_ICONS[role]
              return (
                <li key={role}>
                  <Spotlight className="h-full rounded-xl" color="rgb(150 195 255 / 0.16)">
                    <button
                      type="button"
                      onClick={() => signIn(role)}
                      className="glass-surface flex h-full w-full flex-col rounded-xl p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--landing-ground)]"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                        <Icon className="size-4 text-[var(--landing-ink)]" />
                      </span>

                      <span className="mt-4 text-sm font-semibold text-[var(--landing-ink)]">
                        {ROLE_LABELS[role]}
                      </span>

                      <span className="mt-1.5 flex-1 text-13 leading-relaxed text-[var(--landing-ink-muted)]">
                        {ROLE_DESCRIPTIONS[role]}
                      </span>

                      <span className="mt-4 inline-flex items-center gap-1.5 text-13 font-medium text-[var(--landing-ink-soft)]">
                        Enter as {ROLE_LABELS[role]}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </button>
                  </Spotlight>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}
