<template>
  <Setting>
    <p class="tt-minerva-setting-note">Minerva 전용 추가 설정은 없습니다.</p>
  </Setting>
</template>

<script>
import Setting from '~/components/setting';

export default {
  name: 'MinervaSettingModal',
  components: { Setting }
};
</script>

<style scoped>
.tt-minerva-setting-note {
  color: #54595d;
  margin: 0;
}

.skin-theme-clientpref-night .tt-minerva-setting-note {
  color: #a2a9b1;
}
</style>
