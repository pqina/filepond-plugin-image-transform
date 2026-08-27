export const getUniqueId = () =>
    Math.random()
        .toString(36)
        .slice(2, 11);