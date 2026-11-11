import { proxyConnectMessages } from '../../utils/connectMessagesProxy'

export default defineEventHandler((event) => proxyConnectMessages(event))
