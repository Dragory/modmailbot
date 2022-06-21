/* eslint-disable space-unary-ops */
/* eslint-disable space-before-function-paren */
exports.up = async function (knex) {
	if (!await knex.schema.hasTable('blocked_users')) {
		await knex.schema.createTable('blocked_users', table => {
			table.string('user_id', 20).primary().notNullable();
			table.string('blocked_by', 20).nullable();
			table.string('user_name', 128).notNullable();
			table.dateTime('blocked_at').notNullable();
			table.dateTime('expires_at').nullable();
		});
	}
	if (!await knex.schema.hasTable('moderator_role_overrides')) {
		await knex.schema.createTable('moderator_role_overrides', table => {
			table.string('moderator_id', 20).primary().notNullable().unique();
			table.string('thread_id', 36).nullable().defaultTo(null).unique();
			table.string('role_id', 20).notNullable();
		});
	}
	if (!await knex.schema.hasTable('notes')) {
		await knex.schema.createTable('notes', table => {
			table.increments('id');
			table.string('author_id', 20).nullable().index();
			table.mediumtext('body').nullable();
			table.string('user_id', 20).nullable().index();
			table.datetime('created_at');
		});
	}
	if (!await knex.schema.hasTable('snippets')) {
		await knex.schema.createTable('snippets', table => {
			table.string('trigger', 32).primary().notNullable();
			table.text('body').notNullable();
			table.string('created_by', 20).nullable();
			table.dateTime('created_at').notNullable();
		});
	}
	if (!await knex.schema.hasTable('threads')) {
		await knex.schema.createTable('threads', table => {
			table.string('id', 36).primary().notNullable();
			table.text('alert_ids').nullable();
			table.text('metadata').nullable().defaultTo(null);
			table.string('user_id', 20).notNullable().index();
			table.string('user_name', 128).notNullable();
			table.string('channel_id', 20).nullable().unique();
			table.integer('next_message_number').defaultTo(1);
			table.dateTime('scheduled_close_at').index().nullable().defaultTo(null);
			table.string('scheduled_close_id', 20).nullable().defaultTo(null);
			table.string('scheduled_close_name', 128).nullable().defaultTo(null);
			table.integer('scheduled_close_silent').nullable();
			table.dateTime('scheduled_suspend_at').index().nullable().defaultTo(null);
			table.string('scheduled_suspend_id', 20).nullable().defaultTo(null);
			table.string('scheduled_suspend_name', 128).nullable().defaultTo(null);
			table.integer('status').unsigned().notNullable().index();
			table.integer('thread_number').unique();
			table.integer('is_legacy').unsigned().notNullable();
			table.text('log_storage_data').nullable().defaultTo(null);
			table.string('log_storage_type', 255).nullable().defaultTo(null);
			table.dateTime('created_at').notNullable().index();
		});
	}
	if (!await knex.schema.hasTable('thread_messages')) {
		await knex.schema.createTable('thread_messages', table => {
			table.increments('id');
			table.string('thread_id', 36).notNullable().index().references('id').inTable('threads').onDelete('CASCADE');
			table.string('dm_channel_id', 20).nullable();
			table.string('dm_message_id', 20).nullable().unique();
			table.mediumtext('body').notNullable();
			table.integer('message_number').unsigned().nullable();
			table.integer('message_type').unsigned().notNullable();
			table.text('metadata').nullable().defaultTo(null);
			table.integer('next_message_number').defaultTo(1);
			table.string('user_id', 20).nullable();
			table.string('user_name', 128).notNullable();
			table.string('inbox_message_id', 20).nullable().unique();
			table.integer('is_anonymous').unsigned().notNullable();
			table.string('role_name', 255).nullable();
			table.text('attachments').nullable();
			table.text('small_attachments').nullable();
			table.boolean('use_legacy_format').nullable();
			table.dateTime('created_at').notNullable().index();
		});
	}
	if (!await knex.schema.hasTable('updates')) {
		await knex.schema.createTable('updates', table => {
			table.string('available_version', 16).nullable();
			table.dateTime('last_checked').nullable();
		});
	}
};

exports.down = async function (knex) {
	if (await knex.schema.hasTable('blocked_users')) await knex.schema.dropTable('blocked_users');
	if (await knex.schema.hasTable('moderator_role_overrides')) await knex.schema.dropTable('moderator_role_overrides');
	if (await knex.schema.hasTable('notes')) await knex.schema.dropTable('notes');
	if (await knex.schema.hasTable('snippets')) await knex.schema.dropTable('snippets');
	if (await knex.schema.hasTable('threads')) await knex.schema.dropTable('threads');
	if (await knex.schema.hasTable('thread_messages')) await knex.schema.dropTable('thread_messages');
	if (await knex.schema.hasTable('updates')) await knex.schema.dropTable('updates');
};
