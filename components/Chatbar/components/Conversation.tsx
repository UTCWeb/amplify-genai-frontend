import {
  IconCheck,
  IconMessage,
  IconPencil,
  IconTrash,
  IconX,
  IconCloudFilled,
  IconCloud
} from '@tabler/icons-react';
import {
  DragEvent,
  KeyboardEvent,
  MouseEventHandler,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Conversation } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';
import ChatbarContext from '@/components/Chatbar/Chatbar.context';
import { uploadConversation } from '@/services/remoteConversationService';
import { isLocalConversation, isRemoteConversation } from '@/utils/app/conversationStorage';

interface Props {
  conversation: Conversation;
}

export const ConversationComponent = ({ conversation}: Props) => {
  const {
    state: { selectedConversation, messageIsStreaming, checkingItemType, checkedItems, folders},
    handleSelectConversation,
    handleUpdateConversation,
    dispatch: homeDispatch
  } = useContext(HomeContext);

  const foldersRef = useRef(folders);

  useEffect(() => {
      foldersRef.current = folders;
  }, [folders]);

  const { handleDeleteConversation } = useContext(ChatbarContext);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [checkConversations, setCheckConversations] = useState(false);
  const [isChecked, setIsChecked] = useState(false);


  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectedConversation && handleRename(selectedConversation);
    }
  };

  const handleDragStart = (
    e: DragEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  const handleRename = async (conversation: Conversation) => {
    if (renameValue.trim().length > 0) {
      handleUpdateConversation(conversation, {
        key: 'name',
        value: renameValue,
      });
      // you can only rename a conversation that is the cur selected conversation. this is where we have the updated conversation
      if (isRemoteConversation(conversation) && selectedConversation) {
        const renamedSelected = {...selectedConversation, name: renameValue};
        homeDispatch({field: 'selectedConversation', value: renamedSelected});
        uploadConversation(renamedSelected, foldersRef.current);
      }
      setRenameValue('');
      setIsRenaming(false);
    }
  };

  const handleConfirm: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    if (isDeleting) {
      handleDeleteConversation(conversation);
    } else if (isRenaming) {
      handleRename(conversation);
    }
    setIsDeleting(false);
    setIsRenaming(false);
  };

  const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(false);
    setIsRenaming(false);
  };

  const handleOpenRenameModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsRenaming(true);
    selectedConversation && setRenameValue(selectedConversation.name);
  };
  const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  useEffect(() => {
    if (checkingItemType === 'Conversations') setCheckConversations(true);
    if (checkingItemType === null) setCheckConversations(false);
  }, [checkingItemType]);


  useEffect(() => {
    setIsChecked((checkedItems.includes(prompt) ? true : false)); 
  }, [checkedItems]);

  const handleCheckboxChange = (checked: boolean) => {
    if (checked){
      homeDispatch({field: 'checkedItems', value: [...checkedItems, conversation]}); 
    } else {
      homeDispatch({field: 'checkedItems', value: checkedItems.filter((i:any) => i !== conversation)});
    }
  }

  return (
    <div className="conversation-region-1 relative flex items-center">
      {isRenaming && selectedConversation?.id === conversation.id ? (
        <div className="flex w-full items-center gap-3  bg-neutral-200 dark:bg-transparent p-3">
          {isLocalConversation(conversation) ? <IconMessage size={18} className="bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500"/> 
                                             :  <div>
                                                  <IconCloud className="block dark:hidden" size={18} />
                                                  <IconCloudFilled className="hidden dark:block dark:text-neutral-200" size={18} />
                                                </div>}
          <input
            className="conversation-input mr-12 flex-1 overflow-hidden overflow-ellipsis border-neutral-400 bg-transparent text-left text-[12.5px] leading-3 dark:text-white outline-none focus:border-neutral-100"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleEnterDown}
            autoFocus
          />
        </div>
      ) : (
        <button
          className={`conversation-button-1 flex w-full cursor-pointer items-center gap-3  p-3 text-sm transition-colors duration-200 hover:bg-neutral-200 dark:text-neutral-400 bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500 ${
            messageIsStreaming ? 'disabled:cursor-not-allowed' : ''
          } ${
            selectedConversation?.id === conversation.id
              ? 'bg-neutral-200 dark:bg-transparent'
              : ''
          }`}
          onClick={() => handleSelectConversation(conversation)}
          disabled={messageIsStreaming}
          draggable="true"
          onDragStart={(e) => handleDragStart(e, conversation)}
          title="View Conversation"
        >
         {isLocalConversation(conversation) ? <IconMessage size={18} className="bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500" /> 
                                            : <div>
                                                <IconCloud className="block dark:hidden bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500" size={18} />
                                                <IconCloudFilled className="hidden dark:block dark:text-neutral-200 bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500" size={18} />
                                              </div>}
         
          <div
            className={`conversation-region-2 relative max-h-5 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-all text-left text-[12.5px] leading-3 bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500 ${
              selectedConversation?.id === conversation.id ? 'pr-12' : 'pr-1'
            }`}
          >
            {conversation.name}
          </div>
        </button>
      )}

      {(isDeleting || isRenaming) &&
        selectedConversation?.id === conversation.id && (
          <div className="absolute right-1 z-10 flex text-gray-300 bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500">
            <SidebarActionButton handleClick={handleConfirm}>
              <IconCheck size={18} className="bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500"/>
            </SidebarActionButton>
            <SidebarActionButton handleClick={handleCancel}>
              <IconX size={18} className="bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500"/>
            </SidebarActionButton>
          </div>
        )}


      { checkConversations &&  (
        <div className="conversation-region-3 relative flex items-center bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500">
          <div key={conversation.id} className="absolute right-4 z-10">
              <input
              type="checkbox"
              checked={checkedItems.includes(conversation)}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              />
          </div>
        </div>
      )}  

      {selectedConversation?.id === conversation.id &&
        !isDeleting && !isRenaming && !checkConversations &&
        ( <div className="conversation-edit-areas absolute right-1 z-10 flex text-gray-300 dark:hover:bg-blue-500 dark:hover:text-yellow-500">
            <SidebarActionButton handleClick={handleOpenRenameModal} title="Rename Conversation">
              <IconPencil size={18}className="bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500" />
            </SidebarActionButton>
            <SidebarActionButton handleClick={handleOpenDeleteModal} title="Delete Conversation">
              <IconTrash size={18} className="bg-transparent dark:hover:bg-blue-500 dark:hover:text-yellow-500"/>
            </SidebarActionButton>
          </div>
        )}
    </div>
  );
};
