# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

North Star Nav is an AI-powered product strategy engine that helps teams define OKRs (Objectives and Key Results), generate strategic features, select KPIs, and create implementation plans with Power BI integration. The application is built with React/TypeScript, uses Supabase for backend/auth, and leverages AI via Lovable's gateway to generate strategic recommendations.

## Development Commands

### Standard Workflow
- **Install dependencies**: `npm install`
- **Start dev server**: `npm run dev` (runs on port 8080)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

### Environment Setup
- Ensure `.env` file contains Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID)
- Supabase edge functions require LOVABLE_API_KEY to be set in Supabase project settings

## Architecture

### Application Flow
The app follows a 4-step wizard pattern managed in [src/pages/Index.tsx](src/pages/Index.tsx):

1. **OKR Input** ([OKRInput.tsx](src/components/OKRInput.tsx)) - User defines their OKR and software context
2. **Feature Selection** ([FeatureSelection.tsx](src/components/FeatureSelection.tsx)) - AI generates 3 strategic features; user selects one
3. **KPI Selection** ([KPISelection.tsx](src/components/KPISelection.tsx)) - AI generates 6 KPIs; user selects relevant ones
4. **Implementation Plan** ([ImplementationPlan.tsx](src/components/ImplementationPlan.tsx)) - AI generates a 4-phase implementation plan with tracking events

### State Management
- Uses React Query (@tanstack/react-query) for async state management
- Local state is managed via React useState hooks
- Main strategy state is lifted to [Index.tsx](src/pages/Index.tsx) and passed down to components

### Authentication & Data Persistence
- **Auth**: Managed via Supabase Auth with custom [useAuth](src/hooks/useAuth.tsx) hook
- **Protected Routes**: [Index.tsx](src/pages/Index.tsx) redirects to `/auth` if user is not authenticated
- **Database Service**: [src/services/database.ts](src/services/database.ts) handles all Supabase CRUD operations
  - Strategies, features, KPIs, and implementations are all scoped to authenticated users
  - Uses Row Level Security (RLS) policies - see [supabase/migrations](supabase/migrations)

### AI Integration
- **Supabase Edge Function**: [supabase/functions/generate-features/index.ts](supabase/functions/generate-features/index.ts)
  - Single function handles three generation types: 'features', 'kpis', 'implementation'
  - Uses tool calling with strict schemas to ensure structured responses
  - Calls Lovable AI Gateway (google/gemini-2.5-flash model)
  - Important: The function enforces different tool definitions based on type parameter to prevent wrong output structures

### Database Schema
Tables: `profiles`, `strategies`, `features`, `kpis`, `implementations`

Key relationships:
- strategies → features (one-to-many)
- features → kpis (one-to-many)
- strategies → implementations (one-to-many)
- strategies → user_id (foreign key to auth.users)

All tables have RLS policies ensuring users can only access their own data.

### UI Components
- Built with shadcn/ui components ([src/components/ui](src/components/ui))
- Styling uses Tailwind CSS with custom theme configuration in [tailwind.config.ts](tailwind.config.ts)
- Theme toggle ([ThemeToggle.tsx](src/components/ThemeToggle.tsx)) supports light/dark mode via next-themes
- Gradient design system with primary/primary-glow colors and shadow-cosmic/shadow-stellar utilities

### Validation
Input validation is centralized in [src/lib/validation.ts](src/lib/validation.ts) using Zod schemas:
- `validateStrategy` - Ensures OKR is 10-2000 chars
- `validateFeature` - Validates title (3-200 chars) and description (10-1000 chars)
- `validateKPI` - Validates name (3-200 chars) and description (10-1000 chars)

### Export Functionality
[src/lib/exportUtils.ts](src/lib/exportUtils.ts) provides three export formats:
- JSON export
- CSV export (flattened structure)
- PDF export (using jsPDF)

## Key Technical Patterns

### Component Communication
Props drilling is used for the wizard flow. Each step component receives:
- `strategy` - current strategy state
- `onStrategyUpdate` - callback to update strategy
- `onNext` / `onBack` - navigation callbacks
- `loading` - loading state for async operations

### Error Handling
- Toast notifications via [src/hooks/use-toast.ts](src/hooks/use-toast.ts) (shadcn/ui sonner)
- Try/catch blocks in async operations with user-friendly error messages
- Validation errors thrown from Zod schemas are caught and displayed

### Data Loading States
Each step component implements loading states:
- Initial loading: Skeleton cards with pulse animations
- Operation loading: Disabled buttons with "Saving..." text
- AI generation: Animated loading screen with contextual messaging

## Common Development Tasks

### Adding a New Step to the Wizard
1. Create new component in [src/components](src/components)
2. Update `steps` array in [Index.tsx](src/pages/Index.tsx)
3. Add conditional render in [Index.tsx](src/pages/Index.tsx) based on `currentStep`
4. Update navigation logic in `handleNext` and `handleBack`

### Modifying AI Generation
1. Update the appropriate prompt in component files (e.g., [FeatureSelection.tsx](src/components/FeatureSelection.tsx))
2. If changing output structure, update tool definition in [generate-features/index.ts](supabase/functions/generate-features/index.ts)
3. Update validation logic to match new structure
4. Test with 'Test AI Connection' button in OKR Input step

### Adding New Database Tables
1. Create migration in [supabase/migrations](supabase/migrations)
2. Add RLS policies to scope data to authenticated users
3. Update [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) if using auto-generated types
4. Add service methods in [src/services/database.ts](src/services/database.ts)

### Path Aliases
The project uses `@/` alias for [src/](src/) directory (configured in [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json))

## Important Notes

- This is a Lovable.dev project - changes made in Lovable UI will be auto-committed to this repo
- Supabase client configuration includes auto token refresh and localStorage persistence
- The app uses Vite with React SWC plugin for fast HMR
- Component tagging (lovable-tagger) is enabled in development mode for Lovable integration
