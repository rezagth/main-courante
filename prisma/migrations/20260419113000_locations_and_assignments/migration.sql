-- Locations under hospitals (sites)
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_location_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "location_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_location_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_manager_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_manager_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "locations_tenant_id_site_id_code_key" ON "locations"("tenant_id", "site_id", "code");
CREATE UNIQUE INDEX "locations_id_tenant_id_key" ON "locations"("id", "tenant_id");
CREATE INDEX "locations_tenant_id_site_id_name_idx" ON "locations"("tenant_id", "site_id", "name");

CREATE UNIQUE INDEX "user_location_assignments_tenant_user_site_location_start_key"
ON "user_location_assignments"("tenant_id", "user_id", "site_id", "location_id", "started_at");
CREATE INDEX "user_location_assignments_tenant_user_ended_idx"
ON "user_location_assignments"("tenant_id", "user_id", "ended_at");
CREATE INDEX "user_location_assignments_tenant_site_location_ended_idx"
ON "user_location_assignments"("tenant_id", "site_id", "location_id", "ended_at");

CREATE UNIQUE INDEX "site_manager_assignments_tenant_user_site_started_key"
ON "site_manager_assignments"("tenant_id", "user_id", "site_id", "started_at");
CREATE INDEX "site_manager_assignments_tenant_user_ended_idx"
ON "site_manager_assignments"("tenant_id", "user_id", "ended_at");
CREATE INDEX "site_manager_assignments_tenant_site_ended_idx"
ON "site_manager_assignments"("tenant_id", "site_id", "ended_at");

ALTER TABLE "locations"
ADD CONSTRAINT "locations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "locations"
ADD CONSTRAINT "locations_site_id_tenant_id_fkey"
FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_location_assignments"
ADD CONSTRAINT "user_location_assignments_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_location_assignments"
ADD CONSTRAINT "user_location_assignments_user_id_tenant_id_fkey"
FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_location_assignments"
ADD CONSTRAINT "user_location_assignments_site_id_tenant_id_fkey"
FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_location_assignments"
ADD CONSTRAINT "user_location_assignments_location_id_tenant_id_fkey"
FOREIGN KEY ("location_id", "tenant_id") REFERENCES "locations"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "site_manager_assignments"
ADD CONSTRAINT "site_manager_assignments_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "site_manager_assignments"
ADD CONSTRAINT "site_manager_assignments_user_id_tenant_id_fkey"
FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "site_manager_assignments"
ADD CONSTRAINT "site_manager_assignments_site_id_tenant_id_fkey"
FOREIGN KEY ("site_id", "tenant_id") REFERENCES "sites"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
