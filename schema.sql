--
-- PostgreSQL database dump
--

\restrict uoVrtWHJAZo7AZvqipMc5mhpwea3hlpslmecSBIGfzQCPMwEfDldSYR2VZS7rsz

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AlbumRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AlbumRole" AS ENUM (
    'viewer',
    'editor'
);


--
-- Name: MediaStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MediaStatus" AS ENUM (
    'uploading',
    'processing',
    'ready',
    'deleted'
);


--
-- Name: MediaType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MediaType" AS ENUM (
    'image',
    'video'
);


--
-- Name: UploadSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UploadSource" AS ENUM (
    'file',
    'streaming'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Album; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Album" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    title text NOT NULL,
    "coverMediaId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AlbumMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AlbumMedia" (
    "albumId" text NOT NULL,
    "mediaId" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AlbumShare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AlbumShare" (
    id text NOT NULL,
    "albumId" text NOT NULL,
    "userId" text NOT NULL,
    role public."AlbumRole" DEFAULT 'viewer'::public."AlbumRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Media" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    type public."MediaType" NOT NULL,
    "originalKey" text NOT NULL,
    "thumbnailKey" text,
    "mimeType" text NOT NULL,
    "sizeBytes" bigint,
    width integer,
    height integer,
    "durationSeconds" integer,
    "takenAt" timestamp(3) without time zone,
    title text NOT NULL,
    status public."MediaStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "masterKey" text,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: MediaShare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MediaShare" (
    id text NOT NULL,
    "mediaId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PublicShare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PublicShare" (
    id text NOT NULL,
    token text NOT NULL,
    "mediaId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UploadSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UploadSession" (
    id text NOT NULL,
    "mediaId" text NOT NULL,
    "s3UploadId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    source public."UploadSource" DEFAULT 'file'::public."UploadSource" NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordAuthEnabled" boolean DEFAULT false NOT NULL,
    "passwordHash" text,
    "storageUsedBytes" bigint DEFAULT 0 NOT NULL,
    "storageQuotaBytes" bigint DEFAULT '10737418240'::bigint NOT NULL,
    "avatarUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AlbumMedia AlbumMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AlbumMedia"
    ADD CONSTRAINT "AlbumMedia_pkey" PRIMARY KEY ("albumId", "mediaId");


--
-- Name: AlbumShare AlbumShare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AlbumShare"
    ADD CONSTRAINT "AlbumShare_pkey" PRIMARY KEY (id);


--
-- Name: Album Album_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Album"
    ADD CONSTRAINT "Album_pkey" PRIMARY KEY (id);


--
-- Name: MediaShare MediaShare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MediaShare"
    ADD CONSTRAINT "MediaShare_pkey" PRIMARY KEY (id);


--
-- Name: Media Media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Media"
    ADD CONSTRAINT "Media_pkey" PRIMARY KEY (id);


--
-- Name: PublicShare PublicShare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PublicShare"
    ADD CONSTRAINT "PublicShare_pkey" PRIMARY KEY (id);


--
-- Name: UploadSession UploadSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UploadSession"
    ADD CONSTRAINT "UploadSession_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AlbumMedia_mediaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AlbumMedia_mediaId_idx" ON public."AlbumMedia" USING btree ("mediaId");


--
-- Name: AlbumShare_albumId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AlbumShare_albumId_userId_key" ON public."AlbumShare" USING btree ("albumId", "userId");


--
-- Name: AlbumShare_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AlbumShare_userId_idx" ON public."AlbumShare" USING btree ("userId");


--
-- Name: Album_ownerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Album_ownerId_createdAt_idx" ON public."Album" USING btree ("ownerId", "createdAt" DESC);


--
-- Name: MediaShare_mediaId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MediaShare_mediaId_userId_key" ON public."MediaShare" USING btree ("mediaId", "userId");


--
-- Name: MediaShare_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MediaShare_userId_idx" ON public."MediaShare" USING btree ("userId");


--
-- Name: Media_ownerId_createdAt_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Media_ownerId_createdAt_id_status_idx" ON public."Media" USING btree ("ownerId", "createdAt" DESC, id DESC, status);


--
-- Name: Media_ownerId_deletedAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Media_ownerId_deletedAt_id_idx" ON public."Media" USING btree ("ownerId", "deletedAt" DESC, id) WHERE ("deletedAt" IS NOT NULL);


--
-- Name: PublicShare_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PublicShare_token_key" ON public."PublicShare" USING btree (token);


--
-- Name: UploadSession_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UploadSession_expiresAt_idx" ON public."UploadSession" USING btree ("expiresAt");


--
-- Name: UploadSession_mediaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UploadSession_mediaId_key" ON public."UploadSession" USING btree ("mediaId");


--
-- Name: UploadSession_s3UploadId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UploadSession_s3UploadId_key" ON public."UploadSession" USING btree ("s3UploadId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: AlbumMedia AlbumMedia_albumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AlbumMedia"
    ADD CONSTRAINT "AlbumMedia_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES public."Album"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AlbumMedia AlbumMedia_mediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AlbumMedia"
    ADD CONSTRAINT "AlbumMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES public."Media"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AlbumShare AlbumShare_albumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AlbumShare"
    ADD CONSTRAINT "AlbumShare_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES public."Album"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AlbumShare AlbumShare_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AlbumShare"
    ADD CONSTRAINT "AlbumShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Album Album_coverMediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Album"
    ADD CONSTRAINT "Album_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES public."Media"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Album Album_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Album"
    ADD CONSTRAINT "Album_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MediaShare MediaShare_mediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MediaShare"
    ADD CONSTRAINT "MediaShare_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES public."Media"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MediaShare MediaShare_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MediaShare"
    ADD CONSTRAINT "MediaShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Media Media_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Media"
    ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PublicShare PublicShare_mediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PublicShare"
    ADD CONSTRAINT "PublicShare_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES public."Media"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UploadSession UploadSession_mediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UploadSession"
    ADD CONSTRAINT "UploadSession_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES public."Media"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict uoVrtWHJAZo7AZvqipMc5mhpwea3hlpslmecSBIGfzQCPMwEfDldSYR2VZS7rsz

