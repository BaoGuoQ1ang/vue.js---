const vnode = {
    type: 'h1',
    props: {
        id: 'hh'
    },
    children: [
        {
            type: 'button',
            children: '提交',
            props: {
                onClick:[ () => {
                    console.log(11111);
                }, () => { console.log(2222)}]
            }
        }
    ]
}

function shouldSetAsProps(el, key, value) {
    // 因为 el.form 是只读的，所以需要通过 setAttribute 设置
    if (key === 'form' && el.tagName === 'INPUT') return false;
    // 用 in 操作符判断 key 是否存在对应的 DOM Properties
    return key in el;
}

const renderer = createRenderer({
    createElement(tag){
        return document.createElement(tag);
    },
    setElementText(el, text){
        el.textContent = text;
    },
    insert(el, parent, anchor = null){
        parent.insertBefore(el, anchor);
    },
    patchProps(el, key, preValue, nextValue){
        // ——————————————事件处理 开始—————————————
        if (/^on/.test(key)) {
            const name = key.slice(2).toLowerCase();
            const invokers = el._vei || ( el._vei = {} );
            let invoker = invokers[key];
            
            if (nextValue) {
                if (!invoker) {
                    invoker = el._vei[key] = (e) => {
                        // 如果事件发生的时间早于事件处理函数绑定的时间，则不执行事件处理函数
                        if (e.timeStamp < invoker.attached) return;
                        if (Array.isArray(invoker.value)) {
                            invoker.value.forEach(fn => fn(e));
                        } else {
                            invoker.value(e);
                        }
                    }
                    invoker.value = nextValue;
                    // 添加 invoker.attached 属性，存储事件处理函数绑定的时间
                    invoker.attached = performance.now();
                    el.addEventListener(name, invoker);
                } else {
                    invoker.value = nextValue;
                }

            } else if (invoker) {
                el.removeEventListener(name, invoker);
            }
        // ——————————————事件处理 结束—————————————
        } else if (key === 'class'){
            // class 的处理
            el.className = nextValue || '';
        } else if (shouldSetAsProps(el, key, nextValue)) {
            // 获取该 DOM 的 Properties 类型
            const type = typeof el[key];
            // 如果是布尔类型，并且 value 是空字符串，则将值纠正为 true
            if (type === 'boolean' && nextValue === '') {
                el[key] = true;
            } else {
                el[key] = nextValue;
            }
        } else {
            // 如果要设置的属性没有对应的 DOM Properties，则使用 setAttribute 函数设置属性
            el.setAttribute(key, nextValue);
        }
    }
});

renderer.render(vnode, document.body);