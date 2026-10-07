import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    blue: '#1E5FC9',
                    lightBlue: '#EAF1FC',
                    dark: '#1F2A44',
                    muted: '#8A94A6',
                    bgLight: '#F4F6FA',
                },
            },
        },
    },

    plugins: [forms],
};
