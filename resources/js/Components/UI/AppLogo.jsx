import React from 'react';

export default function AppLogo({ className = 'w-8 h-8', size, ...props }) {
    const style = size ? { width: size, height: size } : {};
    return (
        <img
            src="/Group 2.svg"
            alt="Home-In Logo"
            className={`object-contain inline-block shrink-0 ${className}`}
            style={style}
            {...props}
        />
    );
}

