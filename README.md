# Digital Village Member Project Showcase

A modern web application for Digital Village members to submit and manage project showcases with AI-powered content generation capabilities.

## Features

- **Interactive Project Submission**: Comprehensive form for project details with real-time validation
- **AI Content Generation**: OpenAI integration for draft suggestions and content assistance
- **Admin Dashboard**: Secure management interface for reviewing and managing submissions
- **Database Integration**: PostgreSQL with Drizzle ORM for reliable data persistence
- **Responsive Design**: Modern UI built with React and Tailwind CSS
- **Session Management**: Secure authentication with PostgreSQL-backed sessions

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **Radix UI** components for accessibility
- **TanStack React Query** for server state management
- **React Hook Form** with Zod validation

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with Neon serverless hosting
- **Drizzle ORM** for database operations
- **Passport.js** for authentication
- **OpenAI API** for content generation

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database (or Neon account)
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/digitalvillager/DV-Member-Project-Showcase.git
cd DV-Member-Project-Showcase
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file with your configuration
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key for content generation | No |
| `NODE_ENV` | Environment (development/production) | No |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes

## Admin Access

Default admin credentials:
- Email: `admin@digitalvillage.com.au`
- Password: `Password123`

**Important**: Change these credentials in production by updating the values in `server/auth.ts`

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Express backend
│   ├── auth.ts           # Authentication logic
│   ├── routes.ts         # API routes
│   ├── db.ts             # Database configuration
│   └── storage.ts        # Data access layer
├── shared/               # Shared TypeScript types
│   └── schema.ts         # Database schema
└── scripts/              # Utility scripts
```

## API Endpoints

### Public Endpoints
- `GET /api/public-projects` - Get public project submissions
- `POST /api/project-submissions` - Submit a new project
- `POST /api/draft-suggestion` - Get AI-generated content suggestions

### Admin Endpoints (Authentication Required)
- `GET /api/project-submissions` - Get all submissions
- `DELETE /api/project-submissions/:id` - Delete a submission
- `POST /api/login` - Admin login
- `POST /api/logout` - Admin logout
- `GET /api/me` - Get current user info

## Database Schema

The application uses two main tables:

### Users
- `id` - Primary key
- `username` - Unique username/email
- `password` - Hashed password
- `createdAt` - Timestamp

### Project Submissions
- `id` - Primary key
- `username` - Submitter name
- `title` - Project title
- `description` - Project description
- `problem` - Problem solved
- `technology` - Technologies used
- `impact` - Project impact
- `team` - Team information
- `status` - Current status
- `contact` - Contact information
- `visibility` - Public/private/internal
- `createdAt` - Timestamp
- `userId` - Foreign key to users (optional)

## Deployment

The application is configured for deployment on Replit with autoscaling capabilities. For other platforms:

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Start the production server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please create an issue in the GitHub repository.