// 渲染器函数的实现
const Text = Symbol();
const Comment = Symbol();
const Fragment = Symbol();
function createRenderer(options) {
    const {
        createElement,
        setElementText,
        insert,
        patchProps,
        createText,
        setText,
        createComment,
        setComment
    } = options;

    function mountElement(vnode, container, anchor) {
        const el = vnode.el = createElement(vnode.type);

        if (typeof vnode.children === 'string') {
            setElementText(el, vnode.children);
        } else if (Array.isArray(vnode.children)) {
            vnode.children.forEach(child => {
                patch(null, child, el);
            });

        }

        if (vnode.props) {
            for (const key in vnode.props) {
                patchProps(el, key, null, vnode.props[key])
            }
        }
        insert(el, container, anchor);
    }

    function patch(n1, n2, container, anchor) {
        // 如果新旧 vnode 的类型不同，则直接将旧 vnode 卸载
        if (n1 && n1.type !== n2.type) {
            unmount(n1);
            n1 = null;
        }
        const { type } = n2;
        if (typeof type === 'string') {
            if (!n1) {
                // 如果 n1 不存在表示意味着挂载，调用 mountElement 函数完成挂载
                mountElement(n2, container, anchor);
            } else {
                // n1 存在，意味着打补丁
                patchElement(n1, n2);
            }
        } else if (typeof type === 'object') {
            // 如果 n2 的 type 是个对象，那就说明是个组件
        } else if (type === Text) {
            // 文本节点
            if (!n1) {
                const el = n2.el = createText(n2.children);
                insert(el, container);
            } else {
                const el = n2.el = n1.el;
                if (n2.children !== n1.children) {
                    setText(el, n2.children);
                }
            }
        } else if (type === Comment) {
            // 注释节点
            if (!n1) {
                const el = n2.el = createComment(n2.children);
                insert(el, container);
            } else {
                const el = n2.el = n1.el;
                if (n2.children !== n1.children) {
                    setComment(el, n2.children);
                }
            }
        } else if (type === Fragment) {
            if (!n1) {
                n2.children.forEach(c => patch(null, c, container));
            } else {
                patchChildren(n1, n2, container);
            }
        }
    }

    function render(vnode, container) {
        if (vnode) {
            patch(container._vnode, vnode, container);
        } else {
            if (container._vnode) {
                // document.body.innerHTML = '';
                unmount(container._vnode);

            }
        }
        container._vnode = vnode;
    }

    function unmount(vnode) {
        // 在卸载时如果 vnode 类型为 Fragment，则需要卸载其 children
        if (vnode.type === Fragment) {
            vnode.children.forEach(c => unmount(c));
            return;
        }
        const parent = vnode.el.parentNode;
        if (parent) parent.removeChild(vnode.el);
    }

    function patchElement(n1, n2) {
        const el = n2.el = n1.el;
        const oldProps = n1.props;
        const newProps = n2.props;
        for (const key in newProps) {
            if (newProps[key] !== oldProps[key]) {
                patchProps(el, key, oldProps[key], newProps[key]);
            }
        }
        for (const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, oldProps[key], null);
            }
        }
        patchChildren(n1, n2, el);
    }

    function patchChildren(n1, n2, container) {
        // 判断新子节点是一个文本节点
        if (typeof n2.children === 'string') {
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c));
            }
            setElementText(container, n2.children);
        } else if (Array.isArray(n2.children)) {
            patchKeyeChildren(n1, n2, container);

        } else {
            // 代码运行到这里，说明新子节点不存在
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c));
            } else {
                setElementText(container, '');
            }
        }
    }

    // 快速 Diff 算法的原理
    function patchKeyeChildren(n1, n2, container) {
        const oldChildren = n1.children;
        const newChildren = n2.children;
        
        // 更新相同的前置节点
        let j = 0;
        let oldVNode = oldChildren[j];
        let newVNode = newChildren[j];
        while (oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container);
            j++;
            oldVNode = oldChildren[j];
            newVNode = newChildren[j];
        }

        // 更新相同的后置节点
        let oldEnd = oldChildren.length - 1;
        let newEnd = newChildren.length - 1;
        oldVNode = oldChildren[oldEnd];
        newVNode = newChildren[newEnd];
        while(oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container);
            oldEnd--;
            newEnd--;
            oldVNode = oldChildren[oldEnd];
            newVNode = newChildren[oldEnd];
        }

        // 处理完毕后满足以下条件则说明 
        if (j > oldEnd && j <= newEnd) {
            // 新增元素
            const anchorIndex = newEnd + 1;
            const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null;
            while (j <= newEnd) {
                patch(null, newChildren[j++], container, anchor);
            }
        } else if (j > newEnd && j <= oldEnd) {
            // 删除节点
            while (j <= oldEnd) {
                unmount(oldChildren[j++]);
            }
        } else {
            const count = newEnd - j + 1;
            const source = new Array(count);
            source.fill(-1);

            // oldStart 和 newStart 分别为起始索引，即 j
            const oldStart = j;
            const newStart = j;
            
            // 构建索引表
            const keyIndex = {};
            
            let moved = false;
            let pos = 0;
            for (let i = newStart; i <= newEnd; i++) {
                keyIndex[newChildren[i].key] = i;
            }
            // 代表更新过的节点数量
            let patched = 0;
            // 遍历旧的一组节点中剩余未处理的节点
            for (let i = oldStart; i <= oldEnd; i++) {
                oldVNode = oldChildren[i];
                // 如果更新过的节点数量小于等于需要更新的节点数量，则执行更新
                if (patched <= count) {
                    
                    // 通过索引表快速找到新的一组节点中具有相同 key 值的节点位置
                    const k = keyIndex[oldVNode.key];
                    if (typeof k !== 'undefined') {
                        newVNode = newChildren[k]
                        // 调用 patch 函数完成更新
                        patch(oldVNode, newVNode, container);
                        // 每次更新一个节点都将 patched 加一
                        patched++;
                        // 填充 source 数组
                        source[k - newStart] = i;
                        // 判断节点是否需要移动
                        if (k < pos) {
                            moved = true;
                        } else {
                            pos = k;
                        }
                    } else {
                        // 没找到
                        unmount(oldVNode);
                    }
                } else {
                    // 如果更新过的节点数量大于需要更新的节点数量，则卸载多余的节点
                    unmount(oldVNode);
                }
            }

            // 移动元素
            if (moved) {
                const seq = getSequence(source);
                // s 指向最长递增序列的最后一个元素
                let s = seq.length - 1;
                // i 指向新的一组子节点的最后一个元素
                let i = count - 1;
                // for 循环使得 i 递减
                for (i; i >= 0; i--) {
                    if (source[i] === -1) {
                        // 全新的节点，需要挂载
                        // 该节点在新的 children 中真实的索引位置
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];
                        // 该节点的下一个节点位置
                        const nextPos = pos + 1;
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        // 挂载
                        patch(null, newVNode, container, anchor);
                    } else if (i !== seq[s]) {
                        // 如果节点索引 i 不等于 seq[s] 的值，说明该节点需要移动
                        // 该节点在新的 children 中真实的索引位置
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];
                        // 该节点的下一个节点位置
                        const nextPos = pos + 1;
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        insert(newVNode.el, container, anchor);
                    } else {
                        // 当 i === seq[s] 时说明该位置的节点不需要移动
                        // 只需要让 s 指向下一个位置
                        s--;
                    }
                }
            }
        }
    }

    // 以为书中没有提供该方法
    // 到 github 在 vue.js 3 中找到后又返回接着看书才发现有...
    // 获取最长递增子序列 取自 vue.js 3:
    function getSequence(arr) {
        const p = arr.slice()
        const result = [0]
        let i, j, u, v, c
        const len = arr.length
        for (i = 0; i < len; i++) {
            const arrI = arr[i]
            if (arrI !== 0) {
                j = result[result.length - 1]
                if (arr[j] < arrI) {
                    p[i] = j
                    result.push(i)
                    continue
                }
                u = 0
                v = result.length - 1
                while (u < v) {
                    c = (u + v) >> 1
                    if (arr[result[c]] < arrI) {
                        u = c + 1
                    } else {
                        v = c
                    }
                }
                if (arrI < arr[result[u]]) {
                    if (u > 0) {
                        p[i] = result[u - 1]
                    }
                    result[u] = i
                }
            }
        }
        u = result.length
        v = result[u - 1]
        while (u-- > 0) {
            result[u] = v
            v = p[v]
        }
        return result
    }

    return {
        render
    }
}