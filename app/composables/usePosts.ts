export const usePosts = () => {
  const createPost = async (data: {
    author: number
    content: any
    categories?: string[]
    images?: Array<{ image: string }>
  }) => {
    return await $fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: data
    })
  }

  const getPost = async (id: number | string) => {
    return await $fetch(`/api/posts/${id}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
  }

  const updatePost = async (
    id: number | string,
    data: {
      content?: any
      categories?: string[]
      author?: number
      images?: Array<{ image: string }>
    }
  ) => {
    return await $fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: data
    })
  }

  const deletePost = async (id: number | string) => {
    return await $fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
  }

  return {
    createPost,
    getPost,
    updatePost,
    deletePost
  }
}
