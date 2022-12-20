import { createDirectStore } from "direct-vuex";
import board, { BoardState } from "./modules/board";
import auth, { AuthState } from "./modules/auth";
import card, { CardState } from "./modules/card";
import archive, { ArchiveState } from './modules/archive';

const {
    store,
    rootActionContext,
    moduleActionContext,
    rootGetterContext,
    moduleGetterContext
} = createDirectStore({
    modules: {
        board,
        auth,
        card,
        archive
    }
});

// Export the direct-store instead of the classic Vuex store.
export default store;

// The following exports will be used to enable types in the
// implementation of actions and getters.
export {
    rootActionContext,
    moduleActionContext,
    rootGetterContext,
    moduleGetterContext
};

export interface State {
    auth: AuthState;
    board: BoardState;
    card: CardState;
    archive: ArchiveState;
}
// The following lines enable types in the injected store '$store'.
export type AppStore = typeof store;
declare module "vuex" {
    // eslint-disable-next-line
    interface Store<S> {
        direct: AppStore;
    }
}