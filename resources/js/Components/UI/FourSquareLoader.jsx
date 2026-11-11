import React from 'react';

/**
 * FourSquareLoader — animated 4-square orbit loading indicator.
 *
 * Usage:
 *   <FourSquareLoader />                  — default size (120px)
 *   <FourSquareLoader size={80} />        — smaller
 *   <FourSquareLoader fullscreen />       — centered over the whole viewport
 *   <FourSquareLoader label="Memuat..." />
 */
export default function FourSquareLoader({
    size = 120,
    fullscreen = false,
    label = null,
    className = '',
}) {
    const half = size / 4;          // offset for each square (30px at size=120)
    const sq   = size / 4;          // square dimension

    const squares = [
        { color: 'rgb(158, 136, 246)', shadow: 'rgb(158, 136, 246)', delay: '-1s', init: `translate(-${half}px,-${half}px)` },
        { color: 'rgb(97,  183, 253)', shadow: 'rgb(97,  183, 253)', delay: '-2s', init: `translate(${half}px,-${half}px)`  },
        { color: 'rgb(95,  249, 175)', shadow: 'rgb(95,  249, 175)', delay: '-3s', init: `translate(${half}px,${half}px)`   },
        { color: 'rgb(243, 171, 89)',  shadow: 'rgb(243, 171, 89)',  delay: '-4s', init: `translate(-${half}px,${half}px)`  },
    ];

    /* Keyframe string — injected once via a <style> tag */
    const keyframes = `
@keyframes hil-orbit {
  0%   { transform: translate(-${half}px, -${half}px); }
  25%  { transform: translate(${half}px,  -${half}px); }
  50%  { transform: translate(${half}px,   ${half}px); }
  75%  { transform: translate(-${half}px,  ${half}px); }
  100% { transform: translate(-${half}px, -${half}px); }
}`;

    const loader = (
        <div className={`flex flex-col items-center gap-4 ${className}`}>
            <style>{keyframes}</style>
            <div
                style={{
                    width:    size,
                    height:   size,
                    position: 'relative',
                    display:  'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {squares.map((s, i) => (
                    <div
                        key={i}
                        style={{
                            width:          sq,
                            height:         sq,
                            position:       'absolute',
                            backgroundColor: s.color,
                            boxShadow:      `${s.shadow} 0px 7px 29px 0px`,
                            transform:      s.init,
                            animation:      `hil-orbit 4s infinite`,
                            animationDelay: s.delay,
                            borderRadius:   3,
                        }}
                    />
                ))}
            </div>

            {label && (
                <p style={{ color: '#8A94A6', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>
                    {label}
                </p>
            )}
        </div>
    );

    if (fullscreen) {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                }}
            >
                {loader}
            </div>
        );
    }

    return loader;
}

