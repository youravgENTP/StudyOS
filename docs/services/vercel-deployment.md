---
id: vercel-deployment
type: service
title: Vercel Deployment
summary: Hosts the StudyOS PWA over HTTPS for Mac and iPhone access.
---

# Vercel deployment

Vercel builds the root Vite application and serves `dist/` over HTTPS. Production uses the public Neon service endpoint variables only. The canonical deployment is `https://study-os-eosin.vercel.app`.

CLI deployments work. Automatic Git deployments require the Vercel account's GitHub integration to be granted access to the private `youravgENTP/StudyOS` repository.
