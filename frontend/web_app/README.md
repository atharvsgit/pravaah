# SIH 2025 Web Application

A modern React web application built with Vite, featuring 4 main sections: Home, Report, Community, and Profile.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```bash
src/
├── components/
│   ├── Layout/
│   │   ├── Layout.jsx          # Main layout wrapper
│   │   ├── Navbar.jsx          # Navigation component
│   │   └── index.js            # Layout exports
│   └── shared/
│       ├── Button.jsx          # Reusable button component
│       ├── Input.jsx           # Reusable input component
│       ├── Card.jsx            # Reusable card component
│       └── index.js            # Shared component exports
├── pages/
│   ├── Home/
│   │   ├── Home.jsx            # Home page component
│   │   └── index.js            # Home exports
│   ├── Report/
│   │   ├── Report.jsx          # Report submission page
│   │   └── index.js            # Report exports
│   ├── Community/
│   │   ├── Community.jsx       # Community hub page
│   │   └── index.js            # Community exports
│   └── Profile/
│       ├── Profile.jsx         # User profile page
│       └── index.js            # Profile exports
├── hooks/
│   ├── useApi.js               # API call hooks
│   └── useLocalStorage.js      # LocalStorage hook
├── utils/
│   ├── api.js                  # Axios configuration
│   ├── constants.js            # App constants
│   └── helpers.js              # Utility functions
├── services/                   # API service functions
├── assets/                     # Static assets
├── App.jsx                     # Main app component
└── main.jsx                    # App entry point
```

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **ESLint & Prettier** - Code formatting and linting

## Collaborative Workflow

### Branch Strategy

```bash
main                    # Production-ready code
├── develop            # Integration branch
├── feature/home       # Home page features
├── feature/report     # Report functionality
├── feature/community  # Community features
└── feature/profile    # Profile features
```

### Getting Started for Team Members

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd frontend/web_app
   npm install
   ```

2. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

3. **Development Workflow**
   ```bash
   # Start development server
   npm run dev
   
   # Make your changes
   # Test your changes
   
   # Commit your work
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Create PR from your feature branch to `develop`
   - Add descriptive title and description
   - Request review from team members
   - Ensure all checks pass

### Code Standards

#### File Naming Conventions
- **Components**: PascalCase (`Button.jsx`, `UserProfile.jsx`)
- **Pages**: PascalCase (`Home.jsx`, `Report.jsx`)
- **Utilities**: camelCase (`api.js`, `helpers.js`)
- **Hooks**: camelCase with `use` prefix (`useApi.js`)

#### Component Structure
```jsx
import React from 'react';
import { PropTypes } from 'prop-types';

const ComponentName = ({ prop1, prop2 }) => {
  // Component logic here
  
  return (
    <div className="component-wrapper">
      {/* JSX content */}
    </div>
  );
};

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default ComponentName;
```

#### Import Order
1. React and React-related imports
2. Third-party libraries
3. Internal components
4. Utilities and helpers
5. Styles (if any)

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Input } from '../components/shared';
import { formatDate } from '../utils/helpers';
```

### Team Responsibilities

#### Developer 1: Home & Report Pages
- **Home Page** (`src/pages/Home/`)
  - Dashboard components
  - Quick stats
  - Recent activity feed
  - Navigation shortcuts

- **Report Page** (`src/pages/Report/`)
  - Report form components
  - File upload functionality
  - Location picker
  - Form validation

#### Developer 2: Community & Profile Pages
- **Community Page** (`src/pages/Community/`)
  - Community feed
  - Post creation
  - Groups management
  - Trending topics

- **Profile Page** (`src/pages/Profile/`)
  - User profile management
  - Settings panels
  - Activity history
  - Achievements

### Shared Responsibilities
- **Layout Components** (`src/components/Layout/`)
- **Shared Components** (`src/components/shared/`)
- **Utilities** (`src/utils/`)
- **API Integration** (`src/services/`)

## Development Guidelines

### Before Starting Work
1. Pull latest changes from `develop`
2. Create feature branch
3. Check existing components in `shared/` before creating new ones
4. Review constants in `utils/constants.js`

### During Development
1. Use existing shared components when possible
2. Follow Tailwind CSS utility classes
3. Add proper error handling
4. Write meaningful commit messages
5. Test your changes thoroughly

### Before Submitting PR
1. Run linting: `npm run lint`
2. Format code: `npm run format`
3. Test build: `npm run build`
4. Check for console errors
5. Verify responsive design

### Code Review Checklist
- [ ] Code follows project structure
- [ ] Components are reusable and well-structured
- [ ] Proper error handling implemented
- [ ] Responsive design works on mobile/desktop
- [ ] No console errors or warnings
- [ ] Meaningful variable and function names
- [ ] Comments added for complex logic

## Deployment

### Environment Variables
Create `.env` file in the root directory:
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENVIRONMENT=development
```

### Build Commands
```bash
# Development build
npm run build

# Production build with environment
REACT_APP_ENVIRONMENT=production npm run build
```

## Troubleshooting

### Common Issues
1. **Port already in use**: Change port in `vite.config.js`
2. **Module not found**: Check import paths and file names
3. **Tailwind not working**: Verify `tailwind.config.js` setup
4. **API calls failing**: Check CORS settings and API URL

### Getting Help
1. Check existing issues in the repository
2. Review this README and project structure
3. Ask team members in the project channel
4. Create detailed issue with steps to reproduce

## Additional Notes

- Always use the shared components from `components/shared/`
- Follow the established routing structure
- Use the API utility functions for all HTTP requests
- Maintain consistent styling with Tailwind CSS
- Keep components small and focused on single responsibility

Happy coding! 

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
