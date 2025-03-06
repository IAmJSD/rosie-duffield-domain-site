import PostalMime from 'postal-mime';
import { parse } from 'node-html-parser';
import baseHtml from './base.html.ts';

function sanitizeTextForHtml(text: string) {
	return text
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function emailHtml(email: { from: string; subject: string; text: string; at: number }) {
	return `<hr />
<article>
	<h2>${sanitizeTextForHtml(email.subject)}</h2>
	<p><span style="font-weight: bold;">Date:</span> ${new Date(email.at).toLocaleString()}</p>
	<p><span style="font-weight: bold;">From:</span> ${sanitizeTextForHtml(email.from)}</p>
	<p><pre>${sanitizeTextForHtml(email.text)}</pre></p>
</article>`;
}

export default {
	async fetch(request, env): Promise<Response> {
		// Make sure it is a GET request to /.
		if (request.method !== 'GET' || new URL(request.url).pathname !== '/') {
			return new Response('Not found', { status: 404 });
		}

		// Get the emails.
		const allEmails = await env.EMAILS.list({ prefix: 'email:' });
		const emails = await Promise.all(
			allEmails.keys.map(async (email) => {
				return JSON.parse(await env.EMAILS.get(email.name) || '{}') as {
					from: string;
					subject: string;
					text: string;
					at: number;
				};
			}),
		);
		emails.sort((a, b) => b.at - a.at);

		// Compile the HTML.
		const emailsHtml = emails.map((email) => emailHtml(email)).join('');

		return new Response(baseHtml(emailsHtml), {
			headers: {
				'Content-Type': 'text/html',
				'Cache-Control': 'public, max-age=300',
			},
		});
	},
	async email(message, env) {
		const parsed = await PostalMime.parse(message.raw);
		const text = parsed.text || parse(parsed.html || '').text;
		if (!text) return;

		const { from } = message;
		const subject = parsed.subject || 'No subject';

		await env.EMAILS.put(
			`email:${crypto.randomUUID()}`,
			JSON.stringify({
				from,
				subject,
				text,
				at: Date.now(),
			}),
		);
	},
} satisfies ExportedHandler<Env>;
