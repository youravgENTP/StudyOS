import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({registerType:'autoUpdate',manifest:{name:'StudyOS',short_name:'StudyOS',description:'A calm personal system for studying and daily planning.',theme_color:'#f6f7f8',background_color:'#f6f7f8',display:'standalone'}})],
})
