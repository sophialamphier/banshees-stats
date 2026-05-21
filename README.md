# Boston Banshees Performance Tracker

A rugby stats tracking app for WER's Boston Banshees.

## Stack
- **Frontend**: React + Vite
- **Database**: Supabase (shared real-time data)
- **Hosting**: Netlify (auto-deploys from this repo)

## Local development
```bash
npm install
npm run dev
```

## Deploy
Push to `main` branch → Netlify auto-deploys.

## Making changes
- **Colors**: Edit the brand constants at the top of `src/App.jsx` (ORANGE, NAVY, etc.)
- **Players**: Use the "Manage Roster" screen in the app, or edit `DEFAULT_PLAYERS` in `src/App.jsx`
- **Stats tracked**: Edit `EVENT_TYPES` array in `src/App.jsx`
