-- Step 1: Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Step 3: Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create trigger for updating updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Drop the dangerous public policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.strategies;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.strategies;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.features;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.features;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kpis;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.kpis;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.implementations;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.implementations;

-- Step 6: Create secure user-scoped policies for strategies
CREATE POLICY "Users can view own strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
ON public.strategies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
ON public.strategies
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
ON public.strategies
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 7: Create secure user-scoped policies for features
CREATE POLICY "Users can view own features"
ON public.features
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = features.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own features"
ON public.features
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = features.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own features"
ON public.features
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = features.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own features"
ON public.features
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = features.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

-- Step 8: Create secure user-scoped policies for kpis
CREATE POLICY "Users can view own kpis"
ON public.kpis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.features
    JOIN public.strategies ON strategies.id = features.strategy_id
    WHERE features.id = kpis.feature_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own kpis"
ON public.kpis
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.features
    JOIN public.strategies ON strategies.id = features.strategy_id
    WHERE features.id = kpis.feature_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own kpis"
ON public.kpis
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.features
    JOIN public.strategies ON strategies.id = features.strategy_id
    WHERE features.id = kpis.feature_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own kpis"
ON public.kpis
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.features
    JOIN public.strategies ON strategies.id = features.strategy_id
    WHERE features.id = kpis.feature_id
    AND strategies.user_id = auth.uid()
  )
);

-- Step 9: Create secure user-scoped policies for implementations
CREATE POLICY "Users can view own implementations"
ON public.implementations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = implementations.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own implementations"
ON public.implementations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = implementations.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own implementations"
ON public.implementations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = implementations.strategy_id
    AND strategies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own implementations"
ON public.implementations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = implementations.strategy_id
    AND strategies.user_id = auth.uid()
  )
);