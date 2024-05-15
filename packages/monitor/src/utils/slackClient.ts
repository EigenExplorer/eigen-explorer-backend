import 'dotenv/config'
import { WebClient } from '@slack/web-api'

const slackToken = process.env.SLACK_ACCESS_TOKEN
const slackClient = new WebClient(slackToken)

/**
 * Returns a Slack client with standard bot permissions.
 * @returns
 */
export function getSlackClient() {
	return slackClient
}

/**
 * Sends a message to EigenExplorer Slack workspace.
 * @param channel
 * @param message
 */
export async function sendSlackMessage(
	channel: string,
	message: string
): Promise<void> {
	try {
		const result = await slackClient.chat.postMessage({
			channel: channel,
			text: message
		})
		console.log(`Slack message sent to channel ${channel}\n`)
	} catch (error) {
		console.error('Slack API error: ', error)
	}
}
