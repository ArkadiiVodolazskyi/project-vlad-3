import dotenv from 'dotenv';
dotenv.config();
const config = {
	token: process.env.token,
	status: process.env.status,
	channel_ids: process.env.channel_id.split(' '),
	webhook_urls: process.env.webhook_url.split(' '),
	mention_server: process.env.mention_server,
	mention_original: process.env.mention_original,
	mention_replaced: process.env.mention_replaced
};
export default config;