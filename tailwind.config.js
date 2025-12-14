/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Official WhatsApp Web Dark Colors
                wa: {
                    bg: "#111b21",       // Sidebar BG
                    panel: "#202c33",    // Header/Input BG
                    green: "#00a884",    // Primary Green
                    teal: "#005c4b",     // My Message Bubble
                    dark: "#0b141a",     // Chat BG
                    gray: "#8696a0",     // Text Gray
                    white: "#e9edef",    // Text White
                    danger: "#f15c6d",   // Red/Logout
                }
            },
            backgroundImage: {
                'chat-pattern': "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')"
            }
        },
    },
    plugins: [],
}