<template>
  <Setting>
    <p class="tt-vector-setting-note">Vector 레거시 전용 추가 설정은 없습니다.</p>
  </Setting>
</template>

<script>
import Setting from '~/components/setting';

export default {
  name: 'VectorSettingModal',
  components: { Setting }
};
</script>

<style scoped>
.tt-vector-setting-note {
  color: #54595d;
  margin: 0;
}

.theseed-dark-mode .tt-vector-setting-note {
  color: #a2a9b1;
}
</style>
