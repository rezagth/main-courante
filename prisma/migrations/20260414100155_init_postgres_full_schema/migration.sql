-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Gravite" AS ENUM ('INFO', 'FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_activity_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_quotas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "max_active_users" INTEGER NOT NULL DEFAULT 25,
    "max_entries_per_month" INTEGER NOT NULL DEFAULT 10000,
    "max_storage_gb" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_retention_policies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "active_years" INTEGER NOT NULL DEFAULT 1,
    "archive_years" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invitations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_onboarding_checklists" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "site_created" BOOLEAN NOT NULL DEFAULT false,
    "team_created" BOOLEAN NOT NULL DEFAULT false,
    "agent_invited" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_onboarding_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "original_entry_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purged_at" TIMESTAMPTZ(6),

    CONSTRAINT "archived_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "storage_key" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_feature_flags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "site_id" UUID,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "impersonated_by" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "ip" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "ended_reason" TEXT,
    "last_action_at" TIMESTAMPTZ(6),
    "last_audit_log_id" UUID,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_totp_factors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT,
    "secret_cipher" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "enabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_totp_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_sso_providers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_type" TEXT NOT NULL DEFAULT 'SAML',
    "entity_id" TEXT NOT NULL,
    "sso_url" TEXT NOT NULL,
    "x509_cert_pem" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_evenement" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "default_gravite" "Gravite",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "types_evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrees_main_courante" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type_evenement_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT NOT NULL,
    "localisation" TEXT,
    "photo_url" TEXT,
    "gravite" "Gravite",
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "entrees_main_courante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "site_id" UUID,
    "team_id" UUID,
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_quotas_tenant_id_key" ON "tenant_quotas"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_retention_policies_tenant_id_key" ON "tenant_retention_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_invitations_tenant_id_email_idx" ON "tenant_invitations"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "tenant_invitations_tenant_id_expires_at_idx" ON "tenant_invitations"("tenant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_onboarding_checklists_tenant_id_key" ON "tenant_onboarding_checklists"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_api_keys_tenant_id_is_active_idx" ON "tenant_api_keys"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "archived_entries_tenant_id_archived_at_idx" ON "archived_entries"("tenant_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "archived_entries_tenant_id_original_entry_id_key" ON "archived_entries"("tenant_id", "original_entry_id");

-- CreateIndex
CREATE INDEX "backup_runs_kind_status_started_at_idx" ON "backup_runs"("kind", "status", "started_at");

-- CreateIndex
CREATE INDEX "tenant_feature_flags_tenant_id_enabled_idx" ON "tenant_feature_flags"("tenant_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_feature_flags_tenant_id_key_key" ON "tenant_feature_flags"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "sites_tenant_id_name_idx" ON "sites"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sites_tenant_id_code_key" ON "sites"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sites_id_tenant_id_key" ON "sites"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "teams_tenant_id_site_id_name_idx" ON "teams"("tenant_id", "site_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tenant_id_site_id_code_key" ON "teams"("tenant_id", "site_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_id_tenant_id_key" ON "teams"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_site_id_idx" ON "users"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_last_name_first_name_idx" ON "users"("tenant_id", "last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_tenant_id_key" ON "users"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_tenant_ts" ON "audit_logs"("tenant_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_tenant_action_ts" ON "audit_logs"("tenant_id", "action", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_tenant_user_ts" ON "audit_logs"("tenant_id", "user_id", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_last_audit_log_id_key" ON "impersonation_sessions"("last_audit_log_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_tenant_id_actor_user_id_started_at_idx" ON "impersonation_sessions"("tenant_id", "actor_user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "impersonation_sessions_tenant_id_target_user_id_started_at_idx" ON "impersonation_sessions"("tenant_id", "target_user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "user_totp_factors_tenant_id_user_id_is_verified_idx" ON "user_totp_factors"("tenant_id", "user_id", "is_verified");

-- CreateIndex
CREATE INDEX "tenant_sso_providers_tenant_id_is_active_idx" ON "tenant_sso_providers"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_sso_providers_tenant_id_entity_id_key" ON "tenant_sso_providers"("tenant_id", "entity_id");

-- CreateIndex
CREATE INDEX "team_members_tenant_id_user_id_ended_at_idx" ON "team_members"("tenant_id", "user_id", "ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_tenant_id_team_id_user_id_started_at_key" ON "team_members"("tenant_id", "team_id", "user_id", "started_at");

-- CreateIndex
CREATE INDEX "types_evenement_tenant_id_is_active_idx" ON "types_evenement"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "types_evenement_tenant_id_code_key" ON "types_evenement"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "types_evenement_id_tenant_id_key" ON "types_evenement"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "idx_entries_tenant_site_ts" ON "entrees_main_courante"("tenant_id", "site_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_entries_tenant_team_ts" ON "entrees_main_courante"("tenant_id", "team_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_entries_tenant_user_ts" ON "entrees_main_courante"("tenant_id", "user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_entries_tenant_type_ts" ON "entrees_main_courante"("tenant_id", "type_evenement_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_entries_tenant_sync" ON "entrees_main_courante"("tenant_id", "sync_status");

-- CreateIndex
CREATE INDEX "idx_entries_tenant_deleted" ON "entrees_main_courante"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_entries_search_gin" ON "entrees_main_courante" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "entrees_main_courante_id_tenant_id_key" ON "entrees_main_courante"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "roles"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_tenant_id_key" ON "roles"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_code_key" ON "permissions"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_resource_action_key" ON "permissions"("tenant_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_id_tenant_id_key" ON "permissions"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "role_permissions_tenant_id_permission_id_idx" ON "role_permissions"("tenant_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenant_id_role_id_permission_id_key" ON "role_permissions"("tenant_id", "role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_tenant_id_user_id_valid_to_idx" ON "user_role_assignments"("tenant_id", "user_id", "valid_to");

-- CreateIndex
CREATE INDEX "user_role_assignments_tenant_id_site_id_team_id_idx" ON "user_role_assignments"("tenant_id", "site_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_tenant_id_user_id_role_id_site_id_tea_key" ON "user_role_assignments"("tenant_id", "user_id", "role_id", "site_id", "team_id", "valid_from");

-- AddForeignKey
ALTER TABLE "tenant_quotas" ADD CONSTRAINT "tenant_quotas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_retention_policies" ADD CONSTRAINT "tenant_retention_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_onboarding_checklists" ADD CONSTRAINT "tenant_onboarding_checklists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_entries" ADD CONSTRAINT "archived_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_feature_flags" ADD CONSTRAINT "tenant_feature_flags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_site_id_tenant_id_fkey" FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_tenant_id_fkey" FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_tenant_id_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_impersonated_by_tenant_id_fkey" FOREIGN KEY ("impersonated_by", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_actor_user_id_tenant_id_fkey" FOREIGN KEY ("actor_user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_user_id_tenant_id_fkey" FOREIGN KEY ("target_user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_last_audit_log_id_fkey" FOREIGN KEY ("last_audit_log_id") REFERENCES "audit_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_totp_factors" ADD CONSTRAINT "user_totp_factors_user_id_tenant_id_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sso_providers" ADD CONSTRAINT "tenant_sso_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_tenant_id_fkey" FOREIGN KEY ("team_id", "tenant_id") REFERENCES "teams"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_tenant_id_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_evenement" ADD CONSTRAINT "types_evenement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrees_main_courante" ADD CONSTRAINT "entrees_main_courante_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrees_main_courante" ADD CONSTRAINT "entrees_main_courante_site_id_tenant_id_fkey" FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrees_main_courante" ADD CONSTRAINT "entrees_main_courante_team_id_tenant_id_fkey" FOREIGN KEY ("team_id", "tenant_id") REFERENCES "teams"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrees_main_courante" ADD CONSTRAINT "entrees_main_courante_user_id_tenant_id_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrees_main_courante" ADD CONSTRAINT "entrees_main_courante_type_evenement_id_tenant_id_fkey" FOREIGN KEY ("type_evenement_id", "tenant_id") REFERENCES "types_evenement"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_tenant_id_fkey" FOREIGN KEY ("role_id", "tenant_id") REFERENCES "roles"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_tenant_id_fkey" FOREIGN KEY ("permission_id", "tenant_id") REFERENCES "permissions"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_tenant_id_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_tenant_id_fkey" FOREIGN KEY ("role_id", "tenant_id") REFERENCES "roles"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_site_id_tenant_id_fkey" FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_team_id_tenant_id_fkey" FOREIGN KEY ("team_id", "tenant_id") REFERENCES "teams"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
