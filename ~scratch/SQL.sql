-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_settings (
  key text NOT NULL,
  value text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.knowledge_store (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_url text,
  source_type text,
  title text,
  content_markdown text NOT NULL,
  content_summary text,
  embedding USER-DEFINED,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  corpus_id text,
  CONSTRAINT knowledge_store_pkey PRIMARY KEY (id)
);
CREATE TABLE public.research_presentations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  full_response_markdown text NOT NULL,
  response_length integer NOT NULL,
  citations jsonb,
  source_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT research_presentations_pkey PRIMARY KEY (id)
);