import { defineStore } from "pinia";

import { BoardAPI } from "@/api/board";
import { BoardListAPI } from "@/api/boardList";
import { CardAPI } from "@/api/card";
import { IBoard, IBoardClaims, IBoardList, IBoardRole, ICard, BoardPermission, IDraftBoardList, IBoardAllowedUser, ICardDate, ICardMember, ICardChecklist, IChecklistItem } from "@/api/types";
import { SIOCardUpdateOrder, CardEntity, SIOCardEvent, SIOChecklistItemDeleteEvent } from "@/socket";

export interface State {
    boards: IBoard[];
    board: null | IBoard;
    claims: null | IBoardClaims;
    roles: IBoardRole[];
    users: IBoardAllowedUser[],
}


interface CardPositionInBoard {
    listIndex: number;
    cardIndex: number;
}

/**
 * Find card index on boards
 * 
 * @param lists 
 * @param listId 
 * @param cardId 
 * @returns Found index or if the card indexes not found return listIndex: -1, cardIndex: -1
 */
const findCardIndex = (lists: IBoardList[], listId: number, cardId: number): CardPositionInBoard => {
    const listIndex = lists.findIndex((el) => el.id === listId);

    if (listIndex > -1) {
        const cardIndex = lists[listIndex].cards.findIndex((el) => el.id === cardId);

        if (cardIndex > -1) return { listIndex, cardIndex };
        else return { listIndex: -1, cardIndex: -1 };
    }
    else return { listIndex: -1, cardIndex: -1 };
};

/**
 * Find card entity on board. Similar to findCardIndex but instead of position returns the card.
 * @param lists 
 * @param listId 
 * @param cardId 
 * @returns Card
 */
const findCard = (lists: IBoardList[], listId: number, cardId: number): ICard => {
    const listIndex = lists.findIndex((el) => el.id === listId);

    if (listIndex > -1) {
        const card = lists[listIndex].cards.find((el) => el.id === cardId);

        if (card) return card;
        else throw "Card index of card not found!";
    }
    else throw "List index of card not found!";
};


export const useBoardStore = defineStore('board', {
    state: (): State => ({
        board: null,
        boards: [],
        claims: null,
        roles: [],
        users: [],
    }),
    getters: {
        boardLists: (state: State) => {
            return state.board?.lists || [];
        },
        hasPermission: (state: State) => (permission: BoardPermission) => {
            if (state.claims) {
                const obj = state.claims.role.permissions.find(p => p.name == permission);
                return obj?.allow == undefined ? false : obj?.allow;
            }
            return false;
        },
        isAdmin: (state: State) => {
            if (state.claims)
                return state.claims.role.is_admin;
        },
        boardUser: (state: State) => {
            if (state.claims) {
                return state.claims;
            }
        },
        getBoardUsername: (state: State) => (boardUserId: number) => {
            const user = state.users.find((el) => el.id == boardUserId);
            return user ? user.user.name || user.user.username : "";
        },
        owner: (state: State) => {
            return state.users.find((el) => el.is_owner);
        }
    },
    actions: {
        setBoard(board: IBoard) {
            this.board = board;
        },
        updateBoard(board: Partial<IBoard>) {
            Object.assign(this.board as IBoard, board as IBoard);
            // if (state.board)
            //     state.board = Object.assign(state.board, board as Board);
        },
        setBoards(boards: IBoard[]) {
            this.boards = boards;
        },
        addBoard(board: IBoard) {
            this.boards.push(board);
        },
        setBoardClaims(claims: IBoardClaims) {
            this.claims = claims;
        },
        saveList(boardList: IBoardList) {
            // Check if exists
            if (this.board) {
                const index = this.board.lists.findIndex((el) => el.id === boardList.id);

                if (index === -1) {
                    this.board.lists.push(boardList);
                } else if (this.board) {
                    Object.assign(this.board.lists[index], boardList);
                }
            }
        },
        removeList(boardList: IBoardList) {
            if (this.board) {
                if (boardList.id) {
                    // Delete existing card.
                    const listIndex = this.board.lists.findIndex((el) => el.id == boardList.id);
                    if (listIndex > -1) this.board.lists.splice(listIndex, 1);
                }
                else {
                    // Delete draft
                    this.board.lists.splice(this.board.lists.length - 1, 1);
                }
            }
        },
        saveCard(card: ICard) {
            // Find list
            if (this.board) {
                const listIndex = this.board.lists.findIndex((el) => el.id == card.list_id);
                if (listIndex > -1) {
                    const cardIndex = this.board.lists[listIndex].cards.findIndex((el) => el.id == card.id);
                    if (cardIndex === -1) {
                        this.board.lists[listIndex].cards.push(CardAPI.parseCard(card));
                    } else if (this.board) {
                        this.board.lists[listIndex].cards[cardIndex] = CardAPI.parseCard(card);
                    }
                }
            }
        },
        removeCard(ev: SIOCardEvent) {
            const cardPos = findCardIndex(this.board?.lists || [], ev.list_id, ev.card_id);
            this.board?.lists[cardPos.listIndex].cards.splice(cardPos.cardIndex, 1);
        },
        SIOAddEntityToCard(payload: { event: SIOCardEvent, entityType: CardEntity, entity: unknown; }) {
            const card = findCard(this.board?.lists || [], payload.event.list_id, payload.event.card_id);

            if (payload.entityType === "date") {
                const entity = payload.entity as ICardDate;

                if (!card.dates.find((el) => el.id === entity.id))
                    card.dates.push(CardAPI.parseCardDate(payload.entity as ICardDate));
            }
            else if (payload.entityType === "member") {
                const entity = payload.entity as ICardMember;

                if (!card.assigned_members.find((el) => el.id === entity.id))
                    card.assigned_members.push(entity);
            }
            else if (payload.entityType === "checklist") {
                const entity = payload.entity as ICardChecklist;

                if (!card.checklists.find((el) => el.id === entity.id))
                    card.checklists.push(entity);
            }
        },
        SIOUpdateCardEntity(payload: { event: SIOCardEvent, entityType: CardEntity, entity: unknown; }) {
            const card = findCard(this.board?.lists || [], payload.event.list_id, payload.event.card_id);

            if (payload.entityType === "date") {
                const entity = payload.entity as ICardDate;
                const entityIndex = card.dates.findIndex((el) => el.id == entity.id);

                if (entityIndex > -1) {
                    card.dates[entityIndex] = CardAPI.parseCardDate(entity);
                }
            }
            else if (payload.entityType === "member") {
                const entity = payload.entity as ICardMember;
                const entityIndex = card.assigned_members.findIndex((el) => el.id == entity.id);

                if (entityIndex > -1) {
                    card.assigned_members[entityIndex] = entity;
                }
            }
            else if (payload.entityType === "checklist") {
                const entity = payload.entity as ICardChecklist;
                const entityIndex = card.checklists.findIndex((el) => el.id == entity.id);
                if (entityIndex > -1) {
                    card.checklists[entityIndex] = entity;
                }
            }

        },
        SIODeleteCardEntity(payload: { event: SIOCardEvent, entityType: CardEntity, entity_id: number; }) {
            const card = findCard(this.board?.lists || [], payload.event.list_id, payload.event.card_id);

            if (payload.entityType === "date") {
                const entityIndex = card.dates.findIndex((el) => el.id === payload.entity_id);

                if (entityIndex > -1)
                    card.dates.splice(entityIndex, 1);
            }
            else if (payload.entityType === "member") {
                const entityIndex = card.assigned_members.findIndex((el) => el.id === payload.entity_id);

                if (entityIndex > -1)
                    card.assigned_members.splice(entityIndex, 1);
            }
            else if (payload.entityType === "checklist") {
                const entityIndex = card.checklists.findIndex((el) => el.id === payload.entity_id);
                if (entityIndex > -1)
                    card.checklists.splice(entityIndex, 1);
            }
        },
        SIOUpdateCard(payload: SIOCardEvent) {
            if (this.board) {
                const entity = payload.entity as ICard;

                // If this client changed the card, we should get entity.list_id else we need old list_id from payload.
                let cPos = findCardIndex(this.board.lists, entity.list_id, payload.card_id);
                if (cPos.cardIndex === -1) {
                    cPos = findCardIndex(this.board.lists, payload.list_id, payload.card_id);
                    if (cPos.cardIndex === -1) throw "Card not found";
                }

                if (payload.list_id === entity.list_id) {
                    // Object.assign(state.board.lists[cPos.listIndex].cards[cPos.cardIndex], CardAPI.parseCard(entity));
                    this.board.lists[cPos.listIndex].cards[cPos.cardIndex] = CardAPI.parseCard(entity);
                }
                else {
                    console.log("Move card to other list");
                    this.board.lists[cPos.listIndex].cards.splice(cPos.cardIndex, 1);

                    const newListIndex = this.board.lists.findIndex((el) => el.id === entity.list_id);
                    if (newListIndex > -1) {
                        this.board.lists[newListIndex].cards.splice(
                            entity.position, 0, CardAPI.parseCard(entity));
                        // this.board.lists[newListIndex].cards.push(CardAPI.parseCard(entity));
                    }
                }

            }

        },
        SIOAddChecklistItem(payload: SIOCardEvent) {
            if (this.board) {
                const card = findCard(this.board.lists, payload.list_id, payload.card_id);
                const entity = payload.entity as IChecklistItem;
                const checklist = card.checklists.find((el) => el.id === entity.checklist_id);
                // Find checklist.
                if (checklist) {
                    if (checklist.items.findIndex((el) => el.id === entity.id) === -1) {
                        console.debug("[SIOAddChecklistItem]:Push item into checklist.");
                        checklist.items.push(entity);
                    }
                }
            }

        },
        SIOUpdateChecklistItem(payload: SIOCardEvent) {
            const card = findCard(this.board?.lists || [], payload.list_id, payload.card_id);
            const entity = payload.entity as IChecklistItem;
            const checklist = card.checklists.find((el) => el.id === entity.checklist_id);

            if (checklist) {
                // Find item index
                const itemIndex = checklist.items.findIndex((el) => el.id === entity.id);
                if (itemIndex > -1) checklist.items[itemIndex] = entity;
            }

        },
        SIODeleteChecklistItem(payload: SIOChecklistItemDeleteEvent) {
            const card = findCard(this.board?.lists || [], payload.list_id, payload.card_id);
            const checklist = card.checklists.find((el) => el.id === payload.checklist_id);

            if (checklist) {
                // Find item index
                const itemIndex = checklist.items.findIndex((el) => el.id === payload.entity_id);

                if (itemIndex > -1) checklist.items.splice(itemIndex, 1);
            }

        },
        setBoardRoles(roles: IBoardRole[]) {
            this.roles = roles;
        },
        setBoardUsers(users: IBoardAllowedUser[]) {
            this.users = users;
        },
        unLoadBoard() {
            this.board = null;
            this.claims = null;
            this.roles = [];
            this.users = [];
        },
        setLists(lists: IBoardList[]) {
            if (this.board) this.board.lists = lists;
        },
        setCards(payload: { cards: ICard[], listId: number; }) {
            if (this.board) {
                const list = this.board.lists.find((el) => el.id === payload.listId);
                if (list) list.cards = payload.cards;
            }
        },
        updateListOrder(orderOfIds: number[]) {
            this.board?.lists.sort((a, b) => orderOfIds.indexOf(a.id) - orderOfIds.indexOf(b.id));
            this.board?.lists.forEach((el, index) => {
                el.position = index;
            });
        },
        updateCardOrder(payload: SIOCardUpdateOrder) {
            // Find list
            if (this.board) {
                const listIndex = this.board.lists.findIndex((el) => el.id === payload.list_id);
                if (listIndex > -1) {
                    this.board.lists[listIndex].cards.sort(
                        (a, b) => payload.order.indexOf(a.id) - payload.order.indexOf(b.id));
                    this.board.lists[listIndex].cards.forEach((el, index) => {
                        el.position = index;
                    });
                }
            }
        },
        async loadBoard(payload: { boardId: number; }) {
            const board = await BoardAPI.getBoard(payload.boardId);
            if (board) {
                // Load board claims too!
                this.setBoard(board);
                await this.loadBoardClaims();
                await this.loadBoardRoles();
                await this.loadBoardUsers();
            }
            else {
                console.log("Board issue");
            }
        },
        async loadBoards() {
            this.setBoards(await BoardAPI.getBoards());
        },
        async loadBoardClaims() {
            if (this.board) {
                this.setBoardClaims(await BoardAPI.getBoardClaims(this.board.id));
            }
        },
        async loadBoardRoles() {
            if (this.board) {
                this.setBoardRoles(await BoardAPI.getBoardRoles(this.board.id));
            }
        },
        async loadBoardUsers() {
            if (this.board) {
                this.setBoardUsers(await BoardAPI.getBoardMembers(this.board.id));
            }
        },
        async createBoard(payload: Partial<IBoard>) {
            const data = await BoardAPI.postBoard(payload);
            this.addBoard(data);
            return data;
        },
        async removeBoard(boardId: number) {
            await BoardAPI.deleteBoard(boardId);
            const itemIndex: number = this.boards.findIndex((el) => el.id == boardId);
            if (itemIndex > -1) this.boards.splice(itemIndex, 1);
        },
        async updateBoardList(list: IBoardList) {
            this.saveList(await BoardListAPI.patchBoardList(list.id, list));
        },
        async newBoardList(list: IDraftBoardList) {
            if (this.board) {
                this.saveList(await BoardListAPI.postBoardList(this.board.id, list));
                // Update order of boardlists
                await BoardAPI.updateBoardListsOrder(this.board);
            }
        },
        async removeBoardList(list: IBoardList) {
            if (list.id)
                await BoardListAPI.deleteBoardList(list.id);
            this.removeList(list);
        },
    }
});