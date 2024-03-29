<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide">
        <q-card class="q-dialog-plugin">
            <q-card-section>
                <q-toolbar color="primary">
                    <q-toolbar-title>Add member</q-toolbar-title>
                    <q-btn flat round dense icon="close" @click="onDialogCancel" />
                </q-toolbar>
            </q-card-section>
            <q-form ref="form" @submit.prevent.stop="onAddMemberSubmit" class="q-gutter-md">
                <q-card-section>
                    <q-input v-model="addMemberFormUsername" label="User *" hint="Username or Email"
                        :rules="[validateUser]" debounce="300" autofocus />
                    <q-select v-model="board_role_id" label="Role *" hint="Role" :options="boardRoles" option-value="id"
                        option-label="name" emit-value map-options :rules="[val => !!val || 'Role required!']">
                    </q-select>
                </q-card-section>
                <q-card-actions class="form_actions" align="right">
                    <q-btn type="submit" color="primary" class="full-width">Add member</q-btn>
                </q-card-actions>
            </q-form>

        </q-card>
    </q-dialog>
</template>

<script lang="ts" setup>

import { ref, computed, defineEmits } from "vue";
import { useDialogPluginComponent } from 'quasar';

import { UserAPI } from "@/api/user";
import { BoardAPI } from "@/api/board";
import { useBoardStore } from "@/stores/board";

defineEmits([
    ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
const boardStore = useBoardStore();
const addMemberFormUsername = ref("");
const boardRoles = computed(() => boardStore.roles);
const form = ref();

// These goes into type
const board_role_id = ref();
const user_id = ref();


const onAddMemberSubmit = () => {
    form.value.validate().then((success: boolean) => {
        if (success && boardStore.board) {
            onDialogOK({ board_role_id: board_role_id.value, user_id: user_id.value });
        }
    });
};

/*
Validates if user exists
if exists puts user id into addMemberForm
*/
const validateUser = (val: string): Promise<string | boolean> => {
    return new Promise((resolve) => {
        if (val.length > 0) {
            UserAPI.findUser(val).then((data) => {
                user_id.value = data.id;
                if (boardStore.board) {
                    // If board member returns 404 we good to go!
                    BoardAPI.getBoardMember(boardStore.board.id, data.id).then(() => {
                        resolve("Member already exists!");
                    }).catch(() => resolve(true));
                }
            }).catch(() => {
                resolve("User not found");
            });
        }
        else resolve("Username required!");
    });
};
</script>