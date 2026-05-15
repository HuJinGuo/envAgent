CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    dept VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS knowledge_bases (
                                               id BIGSERIAL PRIMARY KEY,
                                               code VARCHAR(64) UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS sys_roles (
                                         id BIGSERIAL PRIMARY KEY,
                                         code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS sys_menus (
                                         id BIGSERIAL PRIMARY KEY,
                                         parent_id BIGINT,
                                         code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    path VARCHAR(255) NOT NULL,
    component VARCHAR(128),
    icon VARCHAR(64),
    redirect VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS sys_role_menus (
                                              id BIGSERIAL PRIMARY KEY,
                                              role_id BIGINT NOT NULL,
                                              menu_id BIGINT NOT NULL,
                                              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                              UNIQUE (role_id, menu_id)
    );

CREATE TABLE IF NOT EXISTS model_vendors (
                                             id BIGSERIAL PRIMARY KEY,
                                             code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    base_url VARCHAR(512),
    api_key TEXT,
    api_key_masked VARCHAR(128),
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
ALTER TABLE model_vendors ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE model_vendors ADD COLUMN IF NOT EXISTS api_key_masked VARCHAR(128);

CREATE TABLE IF NOT EXISTS sys_dict_items (
                                              id BIGSERIAL PRIMARY KEY,
                                              dict_type VARCHAR(64) NOT NULL,
    dict_label VARCHAR(128) NOT NULL,
    dict_value VARCHAR(128) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (dict_type, dict_value)
    );

CREATE TABLE IF NOT EXISTS ai_models (
                                         id BIGSERIAL PRIMARY KEY,
                                         vendor_id BIGINT NOT NULL,
                                         code VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL,
    model_type VARCHAR(32) NOT NULL DEFAULT 'CHAT',
    context_window INTEGER,
    max_output_tokens INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vendor_id, code)
    );

CREATE TABLE IF NOT EXISTS documents (
                                         id BIGSERIAL PRIMARY KEY,
                                         kb_id BIGINT,
                                         filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(128),
    storage_path TEXT,
    file_size BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    chunk_count INTEGER NOT NULL DEFAULT 0,
    error_msg TEXT,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type VARCHAR(128);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_msg TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS document_chunks (
                                               id BIGSERIAL PRIMARY KEY,
                                               doc_id BIGINT NOT NULL,
                                               content TEXT NOT NULL,
                                               chunk_index INTEGER NOT NULL,
                                               token_count INTEGER NOT NULL DEFAULT 0,
                                               embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS conversations (
                                             id BIGSERIAL PRIMARY KEY,
                                             user_id BIGINT NOT NULL,
                                             title VARCHAR(255) NOT NULL,
    kb_ids BIGINT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
ALTER TABLE conversations ALTER COLUMN kb_ids TYPE BIGINT[] USING kb_ids::bigint[];

CREATE TABLE IF NOT EXISTS messages (
                                        id BIGSERIAL PRIMARY KEY,
                                        conv_id BIGINT NOT NULL,
                                        role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    in_tokens INTEGER,
    out_tokens INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS async_tasks (
                                           id BIGSERIAL PRIMARY KEY,
                                           task_type VARCHAR(64) NOT NULL,
    ref_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_msg TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS agent_tasks (
                                           id BIGSERIAL PRIMARY KEY,
                                           user_id BIGINT NOT NULL,
                                           instruction TEXT NOT NULL,
                                           status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    current_step VARCHAR(64),
    output TEXT,
    error_msg TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS agent_task_logs (
                                               id BIGSERIAL PRIMARY KEY,
                                               task_id BIGINT NOT NULL,
                                               step VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    line TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_kb_id ON documents(kb_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conv_id);
CREATE INDEX IF NOT EXISTS idx_async_tasks_ref ON async_tasks(task_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_sys_role_menus_role ON sys_role_menus(role_id);
CREATE INDEX IF NOT EXISTS idx_sys_role_menus_menu ON sys_role_menus(menu_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_vendor ON ai_models(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sys_dict_items_type ON sys_dict_items(dict_type);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_task_logs_task_id ON agent_task_logs(task_id);
