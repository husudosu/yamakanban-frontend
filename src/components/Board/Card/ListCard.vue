<template>
    <div ref="listCardRef" class="listCard non-selectable" :data-id="props.card.id" @click="onCardClick">
        <template v-if="!editMode">
            <div>
                <!-- Top bar for card  if needed -->
                <template v-if="props.card.assigned_members.length > 0 || props.card.dates.length > 0">
                    <div class="row">
                        <div class="col">
                            <div class="row">
                                <user-avatar v-for="member in props.card.assigned_members.slice(0, 2)" :key="member.id"
                                    :square="true" size="sm" :user="member.board_user.user" class="q-mr-xs">
                                </user-avatar>
                                <template v-if="props.card.assigned_members.length > 2">
                                    ...
                                </template>
                            </div>
                        </div>
                        <div class="col-7 text-right" v-if="props.card.dates.length > 0">
                            <!-- TODO: Check on backend if card dates ordered! -->
                            <card-date-chip :card-date="props.card.dates[0]">
                            </card-date-chip>
                        </div>
                    </div>
                    <q-separator class="q-mb-sm"></q-separator>
                </template>
                <!-- Card title -->
                <li class="title">
                    {{ props.card.title }}
                    <div class="cardEditButton" v-if="boardStore.hasPermission(BoardPermission.CARD_EDIT)">
                        <q-btn size="xs" dense color="blue-grey-6" @click="onEditClick">
                            <q-icon name="edit"></q-icon>
                        </q-btn>
                    </div>
                </li>

                <!-- Card footer if needed -->
                <template v-if="props.card.checklists.length > 0">
                    <q-separator class="q-mt-sm q-mb-xs"></q-separator>
                    <div class="row" v-if="props.card.checklists.length > 0">
                        <checklist-status v-for="checklist in props.card.checklists.slice(0, 3)" :key="checklist.id"
                            class="q-mr-xs" :checklist="checklist"></checklist-status>
                        <template v-if="props.card.checklists.length > 3">
                            ...
                        </template>
                    </div>
                </template>
            </div>
        </template>
        <template v-else>
            <q-input v-model="newTitle" type="textarea" label="Card title" autofocus autogrow
                @keyup.enter="onCardTitleKeyUp" @keyup.escape="onCancelClicked" @blur="onCardTitleBlur">
            </q-input>
            <q-btn class="q-ml-xs q-mr-xs q-mt-sm" size="sm" color="primary" :disable="newTitle.length === 0"
                @click="saveCard">
                Save
            </q-btn>
            <q-btn class="q-mt-sm q-mr-xs" size="sm" outline @click="onCancelClicked">Cancel</q-btn>
            <q-btn class="q-mt-sm" size="sm" flat @click="$emit('archive', card)" dense>
                <q-icon name="archive"></q-icon>
            </q-btn>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { BoardPermission, ICard } from '@/api/types';
import { defineProps, ref, defineEmits } from 'vue';
import UserAvatar from '@/components/UserAvatar.vue';
import CardDateChip from './Status/CardDateChip.vue';
import ChecklistStatus from './Status/ChecklistStatus.vue';

import { useBoardStore } from '@/stores/board';
import { useCardStore } from '@/stores/card';

const props = defineProps<{ card: ICard; }>();
const editMode = ref(false);
const listCardRef = ref();
const newTitle = ref("");

const boardStore = useBoardStore();
const cardStore = useCardStore();

const emit = defineEmits(
    [
        "save",
        "archive",
        "click"
    ]
);

const onCancelClicked = (ev: Event) => {
    console.log("Cancel");
    ev.stopImmediatePropagation();
    editMode.value = false;
    newTitle.value = props.card.title;
    listCardRef.value.classList.remove("draftCard");
};

const onCardTitleBlur = async (ev: FocusEvent) => {
    /*
    This a hacky way to find out if a button clicked.
    */
    if (ev.relatedTarget.tagName === "BUTTON") return;
    saveCard(ev);
};

const saveCard = async (ev: Event) => {
    ev.stopPropagation();
    emit("save", { ...props.card, title: newTitle.value });
    editMode.value = false;
    listCardRef.value.classList.remove("draftCard");
};


const onCardTitleKeyUp = (ev: KeyboardEvent) => {
    if (ev.ctrlKey) saveCard(ev);
};

const onCardClick = () => {
    // Launch card details only if editMode inactive!
    /* FIXME: Hacky way to prevent card click event after move.
     The issue only appears when you move card inside a list
    If you move one list to other it's not an isssue
    */
    if (cardStore.cardMoved) return;
    if (!editMode.value)
        emit("click", props.card);
};

const onEditClick = (ev: Event) => {
    ev.stopPropagation();
    listCardRef.value.classList.add("draftCard");
    newTitle.value = props.card.title;
    editMode.value = true;
};

</script>