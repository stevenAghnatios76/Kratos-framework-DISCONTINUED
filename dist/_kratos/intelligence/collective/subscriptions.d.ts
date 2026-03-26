import { MemoryManager, MemoryEntry } from '../memory/memory-manager';
export interface Subscription {
    id?: number;
    subscriber_agent: string;
    publisher_agent: string;
    event_type: 'decision' | 'finding' | 'pattern' | 'anti-pattern';
    partition_filter?: string;
    enabled: boolean;
}
export declare class SubscriptionManager {
    private db;
    constructor(db: MemoryManager);
    subscribe(sub: Omit<Subscription, 'id'>): Promise<number>;
    unsubscribe(id: number): Promise<void>;
    getSubscriptions(agentId: string): Promise<Subscription[]>;
    setupDefaults(): Promise<void>;
    notifySubscribers(publisherAgent: string, entryId: number, eventType: string): Promise<number>;
    getUnreadNotifications(agentId: string): Promise<{
        entry: MemoryEntry;
        notification_id: number;
        publisher_agent: string;
    }[]>;
    markRead(notificationIds: number[]): Promise<void>;
    formatNotificationsForPrompt(agentId: string): Promise<string>;
    private rowToSubscription;
}
