import { bD as defineStore, r as ref } from './vue-vendor-Cj7sXJnb.js';

const projectStore = defineStore(
  "project",
  () => {
    const allProject = ref([]);
    const project = ref(null);
    return { allProject, project };
  },
  { persist: true }
);

export { projectStore as p };
