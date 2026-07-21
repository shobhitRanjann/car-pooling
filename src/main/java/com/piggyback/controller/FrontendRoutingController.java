package com.piggyback.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards any unhandled routes (like /board, /admin) to index.html
 * so that React Router can handle them.
 */
@Controller
public class FrontendRoutingController {

    @RequestMapping(value = "/{path:[^\\.]*}")
    public String forward() {
        return "forward:/index.html";
    }
}
