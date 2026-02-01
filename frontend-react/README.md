# SplitEasy React Frontend

A modern React-based frontend for the SplitEasy expense splitting application.

## Features

- **Modern UI**: Built with React 18, Tailwind CSS, and shadcn/ui components
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Uses React Query for efficient server state management
- **Authentication**: Secure JWT-based authentication with context management
- **Routing**: Client-side routing with React Router
- **Type Safety**: Built with modern JavaScript and proper error handling

## Tech Stack

- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components
- **React Query** - Server state management and caching
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **Lucide React** - Beautiful, customizable icons

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Backend server running on port 8000

### Installation

1. Navigate to the React frontend directory:
   ```bash
   cd frontend-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Layout.jsx      # Main layout component
│   ├── Sidebar.jsx     # Navigation sidebar
│   └── Header.jsx      # Top header
├── contexts/           # React contexts
│   └── AuthContext.jsx # Authentication context
├── lib/               # Utilities and configurations
│   ├── api.js         # Axios configuration
│   └── utils.js       # Helper functions
├── pages/             # Page components
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── DashboardPage.jsx
│   ├── ExpensesPage.jsx
│   ├── GroupsPage.jsx
│   ├── FriendsPage.jsx
│   ├── SettlePage.jsx
│   ├── WalletsPage.jsx
│   └── ProfilePage.jsx
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## Features Overview

### Dashboard
- Financial overview with income, expenses, and net balance
- Recent expenses list
- Quick action buttons for common tasks

### Expenses
- View and manage all expenses
- Advanced filtering and search
- Pagination for large datasets
- Add new expenses with splitting options

### Groups
- Create and manage expense groups
- View group members and settings
- Group-specific expense tracking

### Friends
- Manage friend connections
- Send and receive friend requests
- Search for users to add as friends

### Settle Up
- View outstanding balances
- Settle debts with friends
- Track payment history

### Wallets
- Manage multiple wallets
- Track balances across different accounts
- Transfer money between wallets

### Profile
- Update personal information
- Manage account settings
- Security and privacy controls

## API Integration

The frontend communicates with the backend API running on port 8000. The API client is configured in `src/lib/api.js` with:

- Automatic token attachment for authenticated requests
- Request/response interceptors for error handling
- Automatic redirect to login on 401 errors

## Styling

The application uses Tailwind CSS with a custom design system:

- **Colors**: Custom color palette defined in `tailwind.config.js`
- **Components**: shadcn/ui components for consistent design
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Ready for dark mode implementation

## State Management

- **Authentication**: React Context for user state
- **Server State**: React Query for API data caching and synchronization
- **Local State**: React hooks for component-level state

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript-style JSDoc comments for better documentation
3. Ensure responsive design for all new components
4. Test on both desktop and mobile viewports
5. Use the existing UI components from the `ui/` directory

## Deployment

To build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.