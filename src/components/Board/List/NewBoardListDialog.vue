<template>
    <q-dialog @hide="onDialogHide" ref="dialogRef" persistent>
        <q-card style="width: 400px;">
            <q-card-section>
                <q-toolbar color="primary">
                    <q-toolbar-title>{{ !props.boardList ? 'New list' : 'Update list' }} </q-toolbar-title>
                    <q-btn flat round dense icon="close" v-close-popup />
                </q-toolbar>
            </q-card-section>
            <q-form @submit="onSubmit" class="q-gutter-md">
                <q-card-section>
                    <q-input v-model="listTitle" label="Title *" lazyRules
                        :rules="[val => val && val.length > 0 || 'Title required!']" />
                    <q-input v-model="listWIPLimit" label="WIP limit" type="number" :rules=[validateWIPLimit]
                        hint="-1 means no WIP limit set" />
                    <q-list class="non-selectable">
                        <q-item v-ripple clickable @click="selectColor('listHeaderBackgroundColor')">
                            <q-item-section>Header background</q-item-section>
                            <q-item-section avatar>
                                <div
                                    :style="{ backgroundColor: listHeaderBackgroundColor, width: '24px', height: '24px', border: '1px solid' }">
                                </div>
                            </q-item-section>
                        </q-item>
                        <q-item v-ripple clickable @click="selectColor('listHeaderTextColor')">
                            <q-item-section>Header text</q-item-section>
                            <q-item-section avatar>
                                <div
                                    :style="{ backgroundColor: listHeaderTextColor, width: '24px', height: '24px', border: '1px solid' }">
                                </div>
                            </q-item-section>
                        </q-item>
                        <q-item v-ripple clickable @click="selectColor('listBackgroundColor')">
                            <q-item-section>List background</q-item-section>
                            <q-item-section avatar>
                                <div
                                    :style="{ backgroundColor: listBackgroundColor, width: '24px', height: '24px', border: '1px solid' }">
                                </div>
                            </q-item-section>
                        </q-item>
                        <q-item v-ripple clickable @click="selectColor('listTextcolor')">
                            <q-item-section>List text</q-item-section>
                            <q-item-section avatar>
                                <div
                                    :style="{ backgroundColor: listTextcolor, width: '24px', height: '24px', border: '1px solid' }">
                                </div>
                            </q-item-section>
                        </q-item>

                    </q-list>
                </q-card-section>

                <q-card-actions align="right" class="form_actions">
                    <q-btn @click="onDialogCancel">Cancel</q-btn>
                    <q-btn type="submit" color="primary">
                        {{
                            !props.boardList ? 'Add' : 'Update'
                        }}
                    </q-btn>
                </q-card-actions>
            </q-form>
        </q-card>
    </q-dialog>
</template>

<script lang="ts" setup>

import { defineEmits, ref, withDefaults, defineProps, onMounted } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useBoardStore } from '@/stores/board';
import { IBoardList } from '@/api/types';
import ColorPickerDialog from '@/components/ColorPickerDialog.vue';

const $q = useQuasar();

defineEmits([
    ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
const props = withDefaults(defineProps<{ boardList?: IBoardList | null; }>(), { boardList: null });

const boardStore = useBoardStore();

const listTitle = ref("");
const listWIPLimit = ref(-1);
const listHeaderTextColor = ref("rgba(255, 255, 255, 1)");
const listHeaderBackgroundColor = ref("rgba(13, 52, 78, 1)");
const listTextcolor = ref("rgba(255, 255, 255, 1)");
const listBackgroundColor = ref("rgba(0, 0, 0, 0)");


const onSubmit = async () => {
    if (boardStore.board) {
        onDialogOK({
            board_id: boardStore.board.id,
            archived: false,
            title: listTitle.value,
            wip_limit: listWIPLimit.value,
            header_textcolor: listHeaderTextColor.value,
            header_bgcolor: listHeaderBackgroundColor.value,
            list_bgcolor: listBackgroundColor.value,
            list_textcolor: listTextcolor.value
        });
    }
};

const validateWIPLimit = (val: number): Promise<string | boolean> => {
    return new Promise((resolve) => {
        if (!props.boardList || val == -1) resolve(true);
        else if (props.boardList.cards.length > val) resolve("You cannot have lower WIP limit than current card count!");
        else resolve(true);
    });
};

const selectColor = (model: string) => {
    $q.dialog(
        {
            component: ColorPickerDialog,
            componentProps: {
                currentColor: model
            }
        }
    ).onOk((color: string) => {
        switch (model) {
            case "listHeaderBackgroundColor":
                listHeaderBackgroundColor.value = color;
                break;
            case "listHeaderTextColor":
                listHeaderTextColor.value = color;
                break;
            case "listBackgroundColor":
                listBackgroundColor.value = color;
                break;
            case "listTextcolor":
                listTextcolor.value = color;
                break;
        }
    });
};

onMounted(() => {
    if (props.boardList) {
        listTitle.value = props.boardList.title;
        listWIPLimit.value = props.boardList.wip_limit;
        listHeaderTextColor.value = props.boardList.header_textcolor;
        listHeaderBackgroundColor.value = props.boardList.header_bgcolor;

        listTextcolor.value = props.boardList.list_textcolor;
        listBackgroundColor.value = props.boardList.list_bgcolor;
    }
});
</script>

<style>
.form_actions button {
    width: 100px;
}
</style>