
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AIService } from '../server/domains/ai/ai.service';

// Mock DB and Notifications BEFORE importing AI Service
vi.mock('../server/db', () => ({
    db: {}
}));

vi.mock('../server/services/notifications', () => ({
    notifyTeacherOfSafetyIncident: vi.fn()
}));

vi.mock('../server/domains/ai/openai.service', () => ({
    openAIService: {}
}));

// Mock OpenAI
const { mockCreate } = vi.hoisted(() => {
    return { mockCreate: vi.fn() };
});

vi.mock('openai', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        }))
    };
});

// Mock DB and Notifications BEFORE importing AI Service
vi.mock('../server/db', () => ({
    db: {}
}));

vi.mock('../server/services/notifications', () => ({
    notifyTeacherOfSafetyIncident: vi.fn()
}));

vi.mock('../server/domains/ai/openai.service', () => ({
    openAIService: {}
}));


describe('AIService - Tutor Flow', () => {
    let aiService: AIService;

    beforeEach(() => {
        vi.clearAllMocks();
        // We can instantiate it, the constructor injects openAIService but we mocked it or it uses default
        aiService = new AIService();
    });

    it('should include summary instruction on 3rd student message', async () => {
        const history = [
            { role: 'tutor', content: 'Hello' },
            { role: 'student', content: 'Msg 1' },
            { role: 'tutor', content: 'Response 1' },
            { role: 'student', content: 'Msg 2' },
            { role: 'tutor', content: 'Response 2' },
            { role: 'student', content: 'Msg 3' }
        ];

        mockCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        response: "Summary",
                        suggestedEvaluation: {},
                        shouldTerminate: true
                    })
                }
            }]
        });

        await aiService.generateTutorResponse({ name: 'Skill' }, history, {});

        const callArgs = mockCreate.mock.calls[0][0];
        const prompt = callArgs.messages[1].content;
        expect(prompt).toContain("NOTE: This is the FINAL turn.");
        expect(prompt).toContain("summarizing statement");
    });

    it('should NOT include summary instruction on 2nd student message', async () => {
        const history = [
            { role: 'tutor', content: 'Hello' },
            { role: 'student', content: 'Msg 1' },
            { role: 'tutor', content: 'Response 1' },
            { role: 'student', content: 'Msg 2' }
        ];

        mockCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        response: "Response",
                        suggestedEvaluation: {},
                        shouldTerminate: false
                    })
                }
            }]
        });

        await aiService.generateTutorResponse({ name: 'Skill' }, history, {});

        const callArgs = mockCreate.mock.calls[0][0];
        const prompt = callArgs.messages[1].content;
        expect(prompt).not.toContain("NOTE: This is the FINAL turn.");
    });
});
