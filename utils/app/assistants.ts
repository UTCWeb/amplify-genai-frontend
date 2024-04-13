import {Assistant, AssistantDefinition, DEFAULT_ASSISTANT} from "@/types/assistant";
import {Prompt} from "@/types/prompt";
import {Message, MessageType} from "@/types/chat";
import {FolderInterface} from "@/types/folder";
import {ReservedTags} from "@/types/tags";
import { saveFolders } from '@/utils/app/folders';


export const isAssistant = (prompt: Prompt) => {
    return prompt.data && prompt.data.assistant;
}

export const setAssistant = (message: Message, assistant: Assistant): Message => {
    if(!assistant || assistant === DEFAULT_ASSISTANT) {
        const newMessage = {...message};
        if(newMessage.data && newMessage.data.assistant) {
            delete newMessage.data.assistant;
        }
        return newMessage;
    }

    return {
        ...message,
        data: {
            ...message.data, assistant: {
                definition: {
                    assistantId: assistant.definition.assistantId,
                    name: assistant.definition.name,
                    ...(assistant.definition.uri ? {uri: assistant.definition.uri} : {}),
                }
            }
        }
    };
}

export const getAssistants = (prompts: Prompt[]): Assistant[] => {
    return prompts
        .filter(isAssistant)
        .map((p) => p.data?.assistant);
}

export const getAssistant = (prompt: Prompt): AssistantDefinition => {
    return prompt.data?.assistant.definition;
}

export const getAssistantFromMessage = (message: Message): AssistantDefinition => {
    return (message.data && message.data.assistant && message.data.assistant.definition) ?
        message.data?.assistant.definition : null;
}

export const createAssistantPrompt = (assistant: AssistantDefinition): Prompt => {

    const access = (assistant.data && assistant.data.access) ?
        assistant.data.access : {read: true, write: false};

    const noEdit = (
        !access.write ||
        (assistant.tags &&
            assistant.tags.includes(ReservedTags.SYSTEM))
    )

    const noDelete = (
        !access.write ||
        (assistant.tags &&
            assistant.tags.includes(ReservedTags.SYSTEM))
    )

    const noShare = (
        !access.write ||
        (assistant.tags &&
            assistant.tags.includes(ReservedTags.SYSTEM))
    )

    return {
        id: assistant.id || "",
        type: MessageType.ROOT,
        name: assistant.name,
        description: assistant.description,
        content: assistant.instructions,
        folderId: "assistants",
        data: {
            assistant: {id: assistant.id, definition: assistant},
            ...(assistant.data || {}),
            noCopy: true,
            noEdit,
            noDelete,
            noShare,
        }
    };
}

export const syncAssistants = (assistants: AssistantDefinition[], folders: FolderInterface[], prompts: Prompt[], dispatch: any) => {
    // Match assistants by name and only take the one with the highest version number for each name
    const latestAssistants = assistants.reduce((acc: { [key: string]: AssistantDefinition }, assistant: AssistantDefinition) => {
        if (!assistant.version) {
            assistant.version = 1;
        }

        // @ts-ignore
        if (!acc[assistant.assistantId] || acc[assistant.assistantId].version < assistant.version) {
            acc[assistant.assistantId || ""] = assistant;
        }
        return acc;
    }, {});
    assistants = Object.values(latestAssistants);
    
    // Make sure the "assistants" folder exists and
    // create it if necessary
    const assistantsFolder = folders.find((f) => f.id === "assistants");
    if (!assistantsFolder) {
        console.log("Creating assistants folder...")
        const newFolder = {
            id: "assistants",
            date: new Date().toISOString().slice(0, 10),
            name: "Assistants",
            type: "prompt",
        } as FolderInterface;
        const updatedFolders = [...folders, newFolder];
        dispatch({field: 'folders', value: updatedFolders});
        saveFolders(updatedFolders);
    }

    const aPrompts: Prompt[] = assistants.map(createAssistantPrompt);

    const withoutAssistants = prompts.filter((p) =>
        !(p.type === MessageType.ROOT && p.data && p.data.assistant)
    );

    console.log("Syncing assistants...", aPrompts, withoutAssistants)

    dispatch({field: 'prompts', value: [...withoutAssistants, ...aPrompts]});
}