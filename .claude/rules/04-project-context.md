# Project Context

## About the App

- **Name**: King of Thursday (ملك الخميس)
- **Purpose**: Group outing management app
- **Users**: 6 friends deciding where to eat each week
- **Language**: Arabic UI, Arabic commits, Arabic jokes
- **Stack**: Next.js, Firebase, TypeScript, Tailwind

## Key Features

- The "King" rotates weekly and picks the restaurant
- Democratic voting is optional (King can be a dictator 👑)
- Push notifications are important for iOS PWA users

## Important Technical Notes

- Service worker caching is tricky on iOS - always test there
- iOS PWA users need special attention for push notifications
