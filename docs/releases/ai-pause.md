# AI and document-study version preserved

The pre-pause source is preserved on archive/rag-document-study-20260908 at
commit 81612c292e00c49079c8a8b72177438c074ae78c. This is a source snapshot,
not a backup of uploaded documents, database records or a running service.
No existing cloud documents or old deployments were modified.

The current student release defaults both ENABLE_LEGACY_AI and
VITE_ENABLE_LEGACY_AI to false. Document ingestion, RAG chat and evaluation
routes are not registered on the backend; the legacy dashboard, document,
chat and model tools are absent from frontend navigation and routing.
School setup, learning logs, revision, peer support and role dashboards remain.
The modules are preserved in their existing directories to avoid a future rewrite.

To resume document study later:

1. Review the preserved source and current dependencies/security requirements.
2. Install backend/requirements.txt instead of requirements.student.txt.
3. Configure private persistent document storage and the chosen AI provider;
   review its cost, data handling and resource requirements before provisioning.
4. Set ENABLE_LEGACY_AI=true on the backend and VITE_ENABLE_LEGACY_AI=true
   on the frontend, then redeploy/rebuild both. Keep access restricted to ADMIN
   until document ownership and student permissions are explicitly implemented.
5. Run document upload/retrieval, authorization and load checks against an
   isolated target before releasing the feature.

Do not enable only the frontend flag: it would expose links to disabled APIs.
Do not use the small student server's ephemeral disk for persistent documents.
The current cloud budget includes no AI or vector service. Refer to
cloud-deployment.md for the remaining $7 minimum / $32 recommended base costs.
