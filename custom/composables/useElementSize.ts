import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'

type ElementSizeState<T extends HTMLElement> = {
  el: ShallowRef<T | null>
  width: Ref<number>
  height: Ref<number>
}

export function useElementSize<T extends HTMLElement>(): ElementSizeState<T> {
  const el = shallowRef<T | null>(null)
  const width = ref(0)
  const height = ref(0)

  let observer: ResizeObserver | undefined

  onMounted(() => {
    observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return
      }

      width.value = Math.floor(entry.contentRect.width)
      height.value = Math.floor(entry.contentRect.height)
    })

    if (el.value) {
      observer.observe(el.value)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })

  return {
    el: el as ShallowRef<T | null>,
    width,
    height,
  }
}
