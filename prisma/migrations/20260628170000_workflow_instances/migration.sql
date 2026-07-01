-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "definitionId" TEXT,
    "processName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepInstance" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStepInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_idx" ON "WorkflowInstance"("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_documentId_idx" ON "WorkflowInstance"("documentId");

-- CreateIndex
CREATE INDEX "WorkflowStepInstance_instanceId_idx" ON "WorkflowStepInstance"("instanceId");

-- CreateIndex
CREATE INDEX "WorkflowStepInstance_approverId_idx" ON "WorkflowStepInstance"("approverId");

-- AddForeignKey
ALTER TABLE "WorkflowStepInstance" ADD CONSTRAINT "WorkflowStepInstance_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
